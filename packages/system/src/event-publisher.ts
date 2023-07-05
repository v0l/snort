import * as secp from "@noble/curves/secp256k1";
import * as utils from "@noble/curves/abstract/utils";
import { unwrap, getPublicKey } from "@snort/shared";

import {
  EventKind,
  FullRelaySettings,
  HexKey,
  Lists,
  Nip44Encryptor,
  NostrEvent,
  RelaySettings,
  TaggedRawEvent,
  u256,
  UserMetadata,
} from ".";

import { EventBuilder } from "./event-builder";
import { EventExt } from "./event-ext";
import { findTag } from "./utils";
import { Nip7Signer } from "./impl/nip7";

type EventBuilderHook = (ev: EventBuilder) => EventBuilder;

export interface EventSigner {
  init(): Promise<void>;
  getPubKey(): Promise<string> | string;
  nip4Encrypt(content: string, key: string): Promise<string>;
  nip4Decrypt(content: string, otherKey: string): Promise<string>;
  sign(ev: NostrEvent): Promise<NostrEvent>;
}

export class PrivateKeySigner implements EventSigner {
  #publicKey: string;
  #privateKey: string;

  constructor(privateKey: string | Uint8Array) {
    if (typeof privateKey === "string") {
      this.#privateKey = privateKey;
    } else {
      this.#privateKey = utils.bytesToHex(privateKey);
    }
    this.#publicKey = getPublicKey(this.#privateKey);
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  getPubKey(): string {
    return this.#publicKey;
  }

  async nip4Encrypt(content: string, key: string): Promise<string> {
    return await EventExt.encryptDm(content, this.#privateKey, key);
  }

  async nip4Decrypt(content: string, otherKey: string): Promise<string> {
    return await EventExt.decryptDm(content, this.#privateKey, otherKey);
  }

  sign(ev: NostrEvent): Promise<NostrEvent> {
    EventExt.sign(ev, this.#privateKey);
    return Promise.resolve(ev);
  }
}

export class EventPublisher {
  #pubKey: string;
  #signer: EventSigner;

  constructor(signer: EventSigner, pubKey: string) {
    this.#signer = signer;
    this.#pubKey = pubKey;
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
    const signer = new PrivateKeySigner(privateKey)
    return new EventPublisher(signer, signer.getPubKey());
  }

  get pubKey() {
    return this.#pubKey;
  }

  #eb(k: EventKind) {
    const eb = new EventBuilder();
    return eb.pubKey(this.#pubKey).kind(k);
  }

  async #sign(eb: EventBuilder) {
    const ev = eb.build();
    return await this.#signer.sign(ev);
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

  async muted(keys: HexKey[], priv: HexKey[]) {
    const eb = this.#eb(EventKind.PubkeyLists);

    eb.tag(["d", Lists.Muted]);
    keys.forEach(p => {
      eb.tag(["p", p]);
    });
    if (priv.length > 0) {
      const ps = priv.map(p => ["p", p]);
      const plaintext = JSON.stringify(ps);
      eb.content(await this.nip4Encrypt(plaintext, this.#pubKey));
    }
    return await this.#sign(eb);
  }

  async noteList(notes: u256[], list: Lists) {
    const eb = this.#eb(EventKind.NoteLists);
    eb.tag(["d", list]);
    notes.forEach(n => {
      eb.tag(["e", n]);
    });
    return await this.#sign(eb);
  }

  async tags(tags: string[]) {
    const eb = this.#eb(EventKind.TagLists);
    eb.tag(["d", Lists.Followed]);
    tags.forEach(t => {
      eb.tag(["t", t]);
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
    note?: HexKey,
    msg?: string,
    fnExtra?: EventBuilderHook
  ) {
    const eb = this.#eb(EventKind.ZapRequest);
    eb.content(msg ?? "");
    if (note) {
      eb.tag(["e", note]);
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
  async reply(replyTo: TaggedRawEvent, msg: string, fnExtra?: EventBuilderHook) {
    const eb = this.#eb(EventKind.TextNote);
    eb.content(msg);

    const thread = EventExt.extractThread(replyTo);
    if (thread) {
      if (thread.root || thread.replyTo) {
        eb.tag(["e", thread.root?.value ?? thread.replyTo?.value ?? "", "", "root"]);
      }
      eb.tag(["e", replyTo.id, replyTo.relays?.[0] ?? "", "reply"]);

      eb.tag(["p", replyTo.pubkey]);
      for (const pk of thread.pubKeys) {
        if (pk === this.#pubKey) {
          continue;
        }
        eb.tag(["p", pk]);
      }
    } else {
      eb.tag(["e", replyTo.id, "", "reply"]);
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
    eb.tag(["e", evRef.id]);
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

  async contactList(follows: Array<HexKey>, relays: Record<string, RelaySettings>) {
    const eb = this.#eb(EventKind.ContactList);
    eb.content(JSON.stringify(relays));

    const temp = new Set(follows.filter(a => a.length === 64).map(a => a.toLowerCase()));
    temp.forEach(a => eb.tag(["p", a]));
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
    eb.tag(["e", note.id, ""]);
    eb.tag(["p", note.pubkey]);
    return await this.#sign(eb);
  }

  async decryptDm(note: NostrEvent) {
    if (note.pubkey !== this.#pubKey && !note.tags.some(a => a[1] === this.#pubKey)) {
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

  /**
   * NIP-59 Gift Wrap event with ephemeral key
   */
  async giftWrap(inner: NostrEvent) {
    const secret = utils.bytesToHex(secp.secp256k1.utils.randomPrivateKey());

    const pTag = findTag(inner, "p");
    if (!pTag) throw new Error("Inner event must have a p tag");

    const eb = new EventBuilder();
    eb.pubKey(getPublicKey(secret));
    eb.kind(EventKind.GiftWrap);
    eb.tag(["p", pTag]);

    const enc = new Nip44Encryptor();
    const shared = enc.getSharedSecret(secret, pTag);
    eb.content(enc.encryptData(JSON.stringify(inner), shared));

    return await eb.buildAndSign(secret);
  }
}
