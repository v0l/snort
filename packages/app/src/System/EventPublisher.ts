import * as secp from "@noble/secp256k1";
import {
  EventKind,
  FullRelaySettings,
  HexKey,
  Lists,
  RawEvent,
  RelaySettings,
  TaggedRawEvent,
  u256,
  UserMetadata,
} from "@snort/nostr";

import { DefaultRelays } from "Const";
import { System } from "System";
import { unwrap } from "Util";
import { EventBuilder } from "./EventBuilder";
import { EventExt } from "./EventExt";

interface Nip7QueueItem {
  next: () => Promise<unknown>;
  resolve(v: unknown): void;
  reject(e: unknown): void;
}

const Nip7QueueDelay = 200;
const Nip7Queue: Array<Nip7QueueItem> = [];
async function processQueue() {
  while (Nip7Queue.length > 0) {
    const v = Nip7Queue.shift();
    if (v) {
      try {
        const ret = await v.next();
        v.resolve(ret);
      } catch (e) {
        v.reject(e);
      }
    }
  }
  setTimeout(processQueue, Nip7QueueDelay);
}
processQueue();

export const barrierNip07 = async <T>(then: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    Nip7Queue.push({
      next: then,
      resolve,
      reject,
    });
  });
};

export type EventBuilderHook = (ev: EventBuilder) => EventBuilder;

export class EventPublisher {
  #pubKey: string;
  #privateKey?: string;

  constructor(pubKey: string, privKey?: string) {
    if (privKey) {
      this.#privateKey = privKey;
      this.#pubKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
    } else {
      this.#pubKey = pubKey;
    }
  }

  get #hasNip07() {
    return "nostr" in window;
  }

  #eb(k: EventKind) {
    const eb = new EventBuilder();
    return eb.pubKey(this.#pubKey).kind(k);
  }

  async #sign(eb: EventBuilder) {
    if (this.#hasNip07 && !this.#privateKey) {
      const nip7PubKey = await barrierNip07(() => unwrap(window.nostr).getPublicKey());
      if (nip7PubKey !== this.#pubKey) {
        throw new Error("Can't sign event, NIP-07 pubkey does not match");
      }
      const ev = eb.build();
      return await barrierNip07(() => unwrap(window.nostr).signEvent(ev));
    } else if (this.#privateKey) {
      return await eb.buildAndSign(this.#privateKey);
    } else {
      throw new Error("Can't sign event, no private keys available");
    }
  }

  async nip4Encrypt(content: string, key: HexKey) {
    if (this.#hasNip07 && !this.#privateKey) {
      const nip7PubKey = await barrierNip07(() => unwrap(window.nostr).getPublicKey());
      if (nip7PubKey !== this.#pubKey) {
        throw new Error("Can't encrypt content, NIP-07 pubkey does not match");
      }
      return await barrierNip07(() => unwrap(window.nostr?.nip04?.encrypt)(key, content));
    } else if (this.#privateKey) {
      return await EventExt.encryptData(content, key, this.#privateKey);
    } else {
      throw new Error("Can't encrypt content, no private keys available");
    }
  }

  async nip4Decrypt(content: string, otherKey: HexKey) {
    if (this.#hasNip07 && !this.#privateKey) {
      return await barrierNip07(() => unwrap(window.nostr?.nip04?.decrypt)(otherKey, content));
    } else if (this.#privateKey) {
      return await EventExt.decryptDm(content, this.#privateKey, otherKey);
    } else {
      throw new Error("Can't decrypt content, no private keys available");
    }
  }

  async nip42Auth(challenge: string, relay: string) {
    const eb = this.#eb(EventKind.Auth);
    eb.tag(["relay", relay]);
    eb.tag(["challenge", challenge]);
    return await this.#sign(eb);
  }

  broadcast(ev: RawEvent) {
    console.debug(ev);
    System.BroadcastEvent(ev);
  }

  /**
   * Write event to DefaultRelays, this is important for profiles / relay lists to prevent bugs
   * If a user removes all the DefaultRelays from their relay list and saves that relay list,
   * When they open the site again we wont see that updated relay list and so it will appear to reset back to the previous state
   */
  broadcastForBootstrap(ev: RawEvent) {
    for (const [k] of DefaultRelays) {
      System.WriteOnceToRelay(k, ev);
    }
  }

  /**
   * Write event to all given relays.
   */
  broadcastAll(ev: RawEvent, relays: string[]) {
    for (const k of relays) {
      System.WriteOnceToRelay(k, ev);
    }
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
        eb.tag(["e", thread.root?.Event ?? thread.replyTo?.Event ?? "", "", "root"]);
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

  async react(evRef: RawEvent, content = "+") {
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
      eb.tag(rTag);
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
  async repost(note: RawEvent) {
    const eb = this.#eb(EventKind.Repost);
    eb.tag(["e", note.id, ""]);
    eb.tag(["p", note.pubkey]);
    return await this.#sign(eb);
  }

  async decryptDm(note: RawEvent) {
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
}
