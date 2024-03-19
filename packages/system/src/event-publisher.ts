import * as secp from "@noble/curves/secp256k1";
import * as utils from "@noble/curves/abstract/utils";
import { unwrap } from "@snort/shared";

import {
  decodeEncryptionPayload,
  EventKind,
  EventSigner,
  FullRelaySettings,
  HexKey,
  MessageEncryptorVersion,
  NostrEvent,
  NostrLink,
  NotSignedNostrEvent,
  PowMiner,
  PrivateKeySigner,
  RelaySettings,
  SignerSupports,
  TaggedNostrEvent,
  ToNostrEventTag,
  u256,
  UserMetadata,
} from ".";

import { EventBuilder } from "./event-builder";
import { EventExt } from "./event-ext";
import { findTag } from "./utils";
import { Nip7Signer } from "./impl/nip7";
import { base64 } from "@scure/base";

type EventBuilderHook = (ev: EventBuilder) => EventBuilder;

export class EventPublisher {
  #pubKey: string;
  #signer: EventSigner;
  #pow?: number;
  #miner?: PowMiner;

  constructor(signer: EventSigner, pubKey: string) {
    this.#signer = signer;
    this.#pubKey = pubKey;
  }

  get signer() {
    return this.#signer;
  }

  /**
   * Create a NIP-07 EventPublisher
   */
  static async nip7() {
    if ("nostr" in window) {
      const signer = new Nip7Signer();
      const pubkey = await signer.getPubKey();
      if (pubkey) {
        return new EventPublisher(signer, pubkey);
      }
    }
  }

  /**
   * Create an EventPublisher for a private key
   */
  static privateKey(privateKey: string) {
    const signer = new PrivateKeySigner(privateKey);
    return new EventPublisher(signer, signer.getPubKey());
  }

  supports(t: SignerSupports) {
    return this.#signer.supports.includes(t);
  }

  get pubKey() {
    return this.#pubKey;
  }

  /**
   * Create a copy of this publisher with PoW
   */
  pow(target: number, miner?: PowMiner) {
    const ret = new EventPublisher(this.#signer, this.#pubKey);
    ret.#pow = target;
    ret.#miner = miner;
    return ret;
  }

  #eb(k: EventKind) {
    const eb = new EventBuilder();
    return eb.pubKey(this.#pubKey).kind(k);
  }

  async #sign(eb: EventBuilder) {
    return await (this.#pow ? eb.pow(this.#pow, this.#miner) : eb).buildAndSign(this.#signer);
  }

  async nip4Encrypt(content: string, otherKey: string) {
    return await this.#signer.nip4Encrypt(content, otherKey);
  }

  async nip4Decrypt(content: string, otherKey: string) {
    return await this.#signer.nip4Decrypt(content, otherKey);
  }

  async nip42Auth(challenge: string, relay: string) {
    const eb = this.#eb(EventKind.Auth);
    eb.tag(["relay", relay]);
    eb.tag(["challenge", challenge]);
    return await this.#sign(eb);
  }

  /**
   * Build a mute list event using lists of pubkeys
   * @param pub Public mute list
   * @param priv Private mute list
   */
  async muted(pub: Array<string>, priv: Array<string>) {
    const eb = this.#eb(EventKind.MuteList);
    pub.forEach(p => {
      eb.tag(["p", p]);
    });
    if (priv.length > 0) {
      const ps = priv.map(p => ["p", p]);
      const plaintext = JSON.stringify(ps);
      eb.content(await this.nip4Encrypt(plaintext, this.#pubKey));
    }
    return await this.#sign(eb);
  }

  /**
   * Build a pin list event using lists of event links
   */
  async pinned(notes: Array<ToNostrEventTag>) {
    const eb = this.#eb(EventKind.PinList);
    notes.forEach(n => {
      eb.tag(unwrap(n.toEventTag()));
    });
    return await this.#sign(eb);
  }

  /**
   * Build a categorized bookmarks event with a given label
   * @param notes List of bookmarked links
   */
  async bookmarks(notes: Array<ToNostrEventTag>) {
    const eb = this.#eb(EventKind.BookmarksList);
    notes.forEach(n => {
      eb.tag(unwrap(n.toEventTag()));
    });
    return await this.#sign(eb);
  }

  async metadata(obj: UserMetadata) {
    const eb = this.#eb(EventKind.SetMetadata);
    eb.content(JSON.stringify(obj));
    return await this.#sign(eb);
  }

  /**
   * Create a basic text note
   */
  async note(msg: string, fnExtra?: EventBuilderHook) {
    const eb = this.#eb(EventKind.TextNote);
    eb.content(msg);
    eb.processContent();
    fnExtra?.(eb);
    return await this.#sign(eb);
  }

  /**
   * Create a zap request event for a given target event/profile
   * @param amount Millisats amout!
   * @param author Author pubkey to tag in the zap
   * @param note Note Id to tag in the zap
   * @param msg Custom message to be included in the zap
   */
  async zap(
    amount: number,
    author: HexKey,
    relays: Array<string>,
    note?: NostrLink,
    msg?: string,
    fnExtra?: EventBuilderHook,
  ) {
    const eb = this.#eb(EventKind.ZapRequest);
    eb.content(msg?.trim() ?? "");
    if (note) {
      // HACK: remove relay tag, some zap services dont like relay tags
      eb.tag(unwrap(note.toEventTag()).slice(0, 2));
    }
    eb.tag(["p", author]);
    eb.tag(["relays", ...relays.map(a => a.trim())]);
    eb.tag(["amount", amount.toString()]);
    eb.processContent();
    fnExtra?.(eb);
    return await this.#sign(eb);
  }

  /**
   * Reply to a note
   */
  async reply(replyTo: TaggedNostrEvent, msg: string, fnExtra?: EventBuilderHook) {
    const eb = this.#eb(EventKind.TextNote);
    eb.content(msg);

    const link = NostrLink.fromEvent(replyTo);
    const thread = EventExt.extractThread(replyTo);
    if (thread) {
      const rootOrReplyAsRoot = thread.root || thread.replyTo;
      if (rootOrReplyAsRoot) {
        eb.tag([rootOrReplyAsRoot.key, rootOrReplyAsRoot.value ?? "", rootOrReplyAsRoot.relay ?? "", "root"]);
      }
      eb.tag([...unwrap(link.toEventTag()), "reply"]);

      eb.tag(["p", replyTo.pubkey]);
      for (const pk of thread.pubKeys) {
        if (pk === this.#pubKey) {
          continue;
        }
        eb.tag(["p", pk]);
      }
    } else {
      eb.tag([...unwrap(link.toEventTag()), "root"]);
      // dont tag self in replies
      if (replyTo.pubkey !== this.#pubKey) {
        eb.tag(["p", replyTo.pubkey]);
      }
    }
    eb.processContent();
    fnExtra?.(eb);
    return await this.#sign(eb);
  }

  async react(evRef: NostrEvent, content = "+") {
    const eb = this.#eb(EventKind.Reaction);
    eb.content(content);
    eb.tag(unwrap(NostrLink.fromEvent(evRef).toEventTag()));
    eb.tag(["p", evRef.pubkey]);
    return await this.#sign(eb);
  }

  async relayList(relays: Array<FullRelaySettings> | Record<string, RelaySettings>) {
    if (!Array.isArray(relays)) {
      relays = Object.entries(relays).map(([k, v]) => ({
        url: k,
        settings: v,
      }));
    }
    const eb = this.#eb(EventKind.Relays);
    for (const rx of relays) {
      const rTag = ["r", rx.url];
      if (rx.settings.read && !rx.settings.write) {
        rTag.push("read");
      }
      if (rx.settings.write && !rx.settings.read) {
        rTag.push("write");
      }
      if (rx.settings.read || rx.settings.write) {
        eb.tag(rTag);
      }
    }
    return await this.#sign(eb);
  }

  async contactList(tags: Array<[string, string]>, relays?: Record<string, RelaySettings>) {
    const eb = this.#eb(EventKind.ContactList);
    tags.forEach(a => eb.tag(a));
    if (relays) {
      eb.content(JSON.stringify(relays));
    }
    return await this.#sign(eb);
  }

  /**
   * Delete an event (NIP-09)
   */
  async delete(id: u256) {
    const eb = this.#eb(EventKind.Deletion);
    eb.tag(["e", id]);
    return await this.#sign(eb);
  }

  /**
   * Repost a note (NIP-18)
   */
  async repost(note: NostrEvent) {
    const eb = this.#eb(EventKind.Repost);
    eb.tag(unwrap(NostrLink.fromEvent(note).toEventTag()));
    eb.tag(["p", note.pubkey]);
    return await this.#sign(eb);
  }

  /**
   * Generic decryption using NIP-23 payload scheme
   */
  async decryptGeneric(content: string, from: string) {
    const pl = decodeEncryptionPayload(content);
    switch (pl.v) {
      case MessageEncryptorVersion.Nip4: {
        const nip4Payload = `${base64.encode(pl.ciphertext)}?iv=${base64.encode(pl.nonce)}`;
        return await this.#signer.nip4Decrypt(nip4Payload, from);
      }
      case MessageEncryptorVersion.XChaCha20: {
        return await this.#signer.nip44Decrypt(content, from);
      }
    }
    throw new Error("Not supported version");
  }

  async decryptDm(note: NostrEvent) {
    if (note.kind === EventKind.SealedRumor) {
      const unseal = await this.unsealRumor(note);
      return unseal.content;
    }
    if (
      note.kind === EventKind.DirectMessage &&
      note.pubkey !== this.#pubKey &&
      !note.tags.some(a => a[1] === this.#pubKey)
    ) {
      throw new Error("Can't decrypt, DM does not belong to this user");
    }
    const otherPubKey = note.pubkey === this.#pubKey ? unwrap(note.tags.find(a => a[0] === "p")?.[1]) : note.pubkey;
    return await this.nip4Decrypt(note.content, otherPubKey);
  }

  async sendDm(content: string, to: HexKey) {
    const eb = this.#eb(EventKind.DirectMessage);
    eb.content(await this.nip4Encrypt(content, to));
    eb.tag(["p", to]);
    return await this.#sign(eb);
  }

  async generic(fnHook: EventBuilderHook) {
    const eb = new EventBuilder();
    eb.pubKey(this.#pubKey);
    fnHook(eb);
    return await this.#sign(eb);
  }

  async appData(data: object, id: string) {
    const eb = this.#eb(EventKind.AppData);
    eb.content(await this.nip4Encrypt(JSON.stringify(data), this.#pubKey));
    eb.tag(["d", id]);
    return await this.#sign(eb);
  }

  /**
   * NIP-59 Gift Wrap event with ephemeral key
   */
  async giftWrap(inner: NostrEvent, explicitP?: string, powTarget?: number, powMiner?: PowMiner) {
    const secret = utils.bytesToHex(secp.secp256k1.utils.randomPrivateKey());
    const signer = new PrivateKeySigner(secret);

    const pTag = explicitP ?? findTag(inner, "p");
    if (!pTag) throw new Error("Inner event must have a p tag");

    const eb = new EventBuilder();
    eb.pubKey(signer.getPubKey());
    eb.kind(EventKind.GiftWrap);
    eb.tag(["p", pTag]);
    if (powTarget) {
      eb.pow(powTarget, powMiner);
    }
    eb.content(await signer.nip44Encrypt(JSON.stringify(inner), pTag));

    return await eb.buildAndSign(secret);
  }

  async unwrapGift(gift: NostrEvent) {
    const body = await this.#signer.nip44Decrypt(gift.content, gift.pubkey);
    return JSON.parse(body) as NostrEvent;
  }

  /**
   * Create an unsigned gossip message
   */
  createUnsigned(kind: EventKind, content: string, fnHook: EventBuilderHook) {
    const eb = new EventBuilder();
    eb.pubKey(this.pubKey);
    eb.kind(kind);
    eb.content(content);
    fnHook(eb);
    return eb.build() as NotSignedNostrEvent;
  }

  /**
   * Create sealed rumor
   */
  async sealRumor(inner: NotSignedNostrEvent, toKey: string) {
    const eb = this.#eb(EventKind.SealedRumor);
    eb.content(await this.#signer.nip44Encrypt(JSON.stringify(inner), toKey));
    return await this.#sign(eb);
  }

  /**
   * Unseal rumor
   */
  async unsealRumor(inner: NostrEvent) {
    if (inner.kind !== EventKind.SealedRumor) throw new Error("Not a sealed rumor event");
    const body = await this.#signer.nip44Decrypt(inner.content, inner.pubkey);
    return JSON.parse(body) as NostrEvent;
  }
}
