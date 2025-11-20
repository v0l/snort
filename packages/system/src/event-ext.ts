import { getPublicKey, sha256, unixNow, unwrap } from "@snort/shared";
import { EventKind, Nip10, Nip22, NostrEvent, NostrLink, NotSignedNostrEvent, parseZap } from ".";
import { minePow } from "./pow-util";
import { findTag } from "./utils";
import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { LRUCache } from "typescript-lru-cache";

/**
 * Generic thread structure extracted from a note
 */
export interface Thread {
  kind: "nip10" | "nip22";
  root?: NostrLink;
  replyTo?: NostrLink;
  mentions: Array<NostrLink>;
  pubKeys: Array<NostrLink>;
}

export const enum EventType {
  Regular,
  Replaceable,
  Addressable,
}

/*
 * Internal cache of parsed threads
 */
const ThreadCache = new LRUCache<string, Thread | undefined>({
  maxSize: 1000,
});

/**
 * Helper class for parsing event data
 */
export abstract class EventExt {
  /**
   * Get the pub key of the creator of this event
   */
  static getRootPubKey(e: NostrEvent): string {
    const delegation = e.tags.find(a => a[0] === "delegation");
    if (delegation?.[1]) {
      // todo: verify sig
      return delegation[1];
    }

    if (e.kind === EventKind.ZapReceipt) {
      const bigP = findTag(e, "P");
      if (bigP) {
        return bigP;
      }
      const parsedZap = parseZap(e);
      if (parsedZap?.sender) {
        return parsedZap.sender;
      }
    }
    return e.pubkey;
  }

  /**
   * Sign this message with a private key
   */
  static sign(e: NostrEvent, key: string) {
    e.pubkey = getPublicKey(key);
    e.id = this.createId(e);

    const sig = schnorr.sign(hexToBytes(e.id), hexToBytes(key));
    e.sig = bytesToHex(sig);
    return e;
  }

  /**
   * Check the signature of this message
   * @returns True if valid signature
   */
  static verify(e: NostrEvent) {
    if ((e.sig?.length ?? 0) < 64) return false;
    const id = this.createId(e);
    const result = schnorr.verify(hexToBytes(e.sig), hexToBytes(id), hexToBytes(e.pubkey));
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
  static forPubKey(pk: string, kind: EventKind) {
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

  static extractThread(ev: NostrEvent): Thread | undefined {
    const cacheKey = EventExt.keyOf(ev);
    const cached = ThreadCache.get(cacheKey);
    if (cached) return cached;

    // parse thread as NIP-22 if there is E+K
    if (ev.tags.some(a => a[0] === "E") && ev.tags.some(a => a[0] === "K")) {
      const v = Nip22.parseThread(ev);
      ThreadCache.set(cacheKey, v);
      return v;
    } else {
      const v = Nip10.parseThread(ev);
      ThreadCache.set(cacheKey, v);
      return v;
    }
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

  static getType(kind: number) {
    const legacyReplaceable = [0, 3, 41];
    if (kind >= 30_000 && kind < 40_000) {
      return EventType.Addressable;
    } else if (kind >= 10_000 && kind < 20_000) {
      return EventType.Replaceable;
    } else if (legacyReplaceable.includes(kind)) {
      return EventType.Replaceable;
    } else {
      return EventType.Regular;
    }
  }

  static isReplaceable(kind: number) {
    const t = EventExt.getType(kind);
    return t === EventType.Replaceable || t === EventType.Addressable;
  }

  static isAddressable(kind: number) {
    const t = EventExt.getType(kind);
    return t === EventType.Addressable;
  }

  static isValid(ev: NostrEvent) {
    const type = EventExt.getType(ev.kind);
    if (type === EventType.Addressable) {
      if (!findTag(ev, "d")) return false;
    }
    return ev.sig !== undefined;
  }

  /**
   * Create a string key for an event
   *
   * Addressable: {kind}:{pubkey}:{identifier}
   *
   * Replaceable: {kind}:{pubkey}
   *
   * {id}
   */
  static keyOf(e: NostrEvent) {
    switch (EventExt.getType(e.kind)) {
      case EventType.Addressable:
        return `${e.kind}:${e.pubkey}:${unwrap(findTag(e, "d"))}`;
      case EventType.Replaceable:
        return `${e.kind}:${e.pubkey}`;
      default:
        return e.id;
    }
  }
}
