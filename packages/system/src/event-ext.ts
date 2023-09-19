import * as secp from "@noble/curves/secp256k1";
import * as utils from "@noble/curves/abstract/utils";
import { getPublicKey, sha256, unixNow } from "@snort/shared";

import { EventKind, HexKey, NostrEvent, NotSignedNostrEvent } from ".";
import { minePow } from "./pow-util";

export interface Tag {
  key: string;
  value?: string;
  relay?: string;
  marker?: string; // NIP-10
}

export interface Thread {
  root?: Tag;
  replyTo?: Tag;
  mentions: Array<Tag>;
  pubKeys: Array<HexKey>;
}

export abstract class EventExt {
  /**
   * Get the pub key of the creator of this event NIP-26
   */
  static getRootPubKey(e: NostrEvent): HexKey {
    const delegation = e.tags.find(a => a[0] === "delegation");
    if (delegation?.[1]) {
      // todo: verify sig
      return delegation[1];
    }
    return e.pubkey;
  }

  /**
   * Sign this message with a private key
   */
  static sign(e: NostrEvent, key: HexKey) {
    e.pubkey = getPublicKey(key);
    e.id = this.createId(e);

    const sig = secp.schnorr.sign(e.id, key);
    e.sig = utils.bytesToHex(sig);
    if (!secp.schnorr.verify(e.sig, e.id, e.pubkey)) {
      throw new Error("Signing failed");
    }
    return e;
  }

  /**
   * Check the signature of this message
   * @returns True if valid signature
   */
  static verify(e: NostrEvent) {
    const id = this.createId(e);
    const result = secp.schnorr.verify(e.sig, id, e.pubkey);
    return result;
  }

  static createId(e: NostrEvent | NotSignedNostrEvent) {
    const payload = [0, e.pubkey, e.created_at, e.kind, e.tags, e.content];
    return sha256(JSON.stringify(payload));
  }

  /**
   * Mine POW for an event (NIP-13)
   */
  static minePow(e: NostrEvent, target: number) {
    return minePow(e, target);
  }

  /**
   * Create a new event for a specific pubkey
   */
  static forPubKey(pk: HexKey, kind: EventKind) {
    return {
      pubkey: pk,
      kind: kind,
      created_at: unixNow(),
      content: "",
      tags: [],
      id: "",
      sig: "",
    } as NostrEvent;
  }

  static parseTag(tag: Array<string>) {
    if (tag.length < 1) {
      throw new Error("Invalid tag, must have more than 2 items");
    }

    const ret = {
      key: tag[0],
      value: tag[1],
    } as Tag;
    switch (ret.key) {
      case "a":
      case "e": {
        ret.relay = tag.length > 2 ? tag[2] : undefined;
        ret.marker = tag.length > 3 ? tag[3] : undefined;
        break;
      }
    }
    return ret;
  }

  static extractThread(ev: NostrEvent) {
    const shouldWriteMarkers = ev.kind === EventKind.TextNote;
    const ret = {
      mentions: [],
      pubKeys: [],
    } as Thread;
    const replyTags = ev.tags.filter(a => a[0] === "e" || a[0] === "a").map(a => EventExt.parseTag(a));
    if(replyTags.length > 0) {
      const marked = replyTags.some(a => a.marker);
      if (!marked) {
        ret.root = replyTags[0];
        ret.root.marker = shouldWriteMarkers ? "root" : undefined;
        if (replyTags.length > 1) {
          ret.replyTo = replyTags[replyTags.length - 1];
          ret.replyTo.marker = shouldWriteMarkers ? "reply" : undefined;
        }
        if (replyTags.length > 2) {
          ret.mentions = replyTags.slice(1, -1);
          if (shouldWriteMarkers) {
            ret.mentions.forEach(a => (a.marker = "mention"));
          }
        }
      } else {
        const root = replyTags.find(a => a.marker === "root");
        const reply = replyTags.find(a => a.marker === "reply");
        ret.root = root;
        ret.replyTo = reply;
        ret.mentions = replyTags.filter(a => a.marker === "mention");
      }
    } else {
      return undefined;
    }
    ret.pubKeys = Array.from(new Set(ev.tags.filter(a => a[0] === "p").map(a => a[1])));
    return ret;
  }

  /**
   * Assign props if undefined
   */
  static fixupEvent(e: NostrEvent) {
    e.tags ??= [];
    e.created_at ??= 0;
    e.content ??= "";
    e.id ??= "";
    e.kind ??= 0;
    e.pubkey ??= "";
    e.sig ??= "";
  }
}
