import { schnorr } from "@noble/curves/secp256k1.js"
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js"
import { getPublicKey, sha256, unixNow, unwrap } from "@snort/shared"
import { LRUCache } from "typescript-lru-cache"
import { EventKind, Nip10, Nip22, type NostrEvent, type NostrLink, type NotSignedNostrEvent, parseZap } from "."
import { minePow } from "./pow-util"
import { findTag } from "./utils"

/**
 * Generic thread structure extracted from a note
 */
export interface Thread {
  kind: "nip10" | "nip22"
  root?: NostrLink
  replyTo?: NostrLink
  mentions: Array<NostrLink>
  pubKeys: Array<NostrLink>
}

export enum EventType {
  Regular,
  Replaceable,
  Addressable,
}

/*
 * Internal cache of parsed threads
 */
const ThreadCache = new LRUCache<string, Thread | undefined>({
  maxSize: 1000,
})

/**
 * Helper class for parsing event data
 */
export abstract class EventExt {
  /**
   * Get the pub key of the creator of this event.
   *
   * NIP-26 delegation tags are intentionally ignored: accepting an unverified
   * delegation tag would allow any event to claim authorship by any pubkey.
   * Full NIP-26 support requires verifying the delegation token signature
   * before trusting the delegator pubkey.
   */
  static getRootPubKey(e: NostrEvent): string {
    if (e.kind === EventKind.ZapReceipt) {
      const bigP = findTag(e, "P")
      if (bigP) {
        return bigP
      }
      const parsedZap = parseZap(e)
      if (parsedZap?.sender) {
        return parsedZap.sender
      }
    }
    return e.pubkey
  }

  /**
   * Sign this message with a private key
   */
  static sign(e: NostrEvent, key: string) {
    e.pubkey = getPublicKey(key)
    e.id = EventExt.createId(e)

    const sig = schnorr.sign(hexToBytes(e.id), hexToBytes(key))
    e.sig = bytesToHex(sig)
    return e
  }

  /**
   * Check the signature of this event.
   * - Validates that `sig` and `pubkey` are correctly-formatted hex strings.
   * - Validates that `id` matches the canonical hash of the event payload.
   * - Verifies the Schnorr signature.
   * Never throws; returns `false` for any malformed or untrusted input.
   * @returns True only if the event is cryptographically authentic.
   */
  static verify(e: NostrEvent) {
    // Schnorr sig = 64 bytes = 128 hex chars; pubkey = 32 bytes = 64 hex chars
    if (!e.sig || e.sig.length !== 128 || !/^[0-9a-f]+$/i.test(e.sig)) return false
    if (!e.pubkey || e.pubkey.length !== 64 || !/^[0-9a-f]+$/i.test(e.pubkey)) return false

    const id = EventExt.createId(e)
    // Verify that the event's id field matches the computed hash
    if (e.id !== id) return false

    try {
      return schnorr.verify(hexToBytes(e.sig), hexToBytes(id), hexToBytes(e.pubkey))
    } catch {
      return false
    }
  }

  static createId(e: NostrEvent | NotSignedNostrEvent) {
    const payload = [0, e.pubkey, e.created_at, e.kind, e.tags, e.content]
    return sha256(JSON.stringify(payload))
  }

  /**
   * Mine POW for an event (NIP-13)
   */
  static minePow(e: NostrEvent, target: number) {
    return minePow(e, target)
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
    } as NostrEvent
  }

  static extractThread(ev: NostrEvent): Thread | undefined {
    const cacheKey = EventExt.keyOf(ev)
    const cached = ThreadCache.get(cacheKey)
    if (cached) return cached

    // parse thread as NIP-22 if there is E+K
    if (ev.tags.some(a => a[0] === "E") && ev.tags.some(a => a[0] === "K")) {
      const v = Nip22.parseThread(ev)
      ThreadCache.set(cacheKey, v)
      return v
    } else {
      const v = Nip10.parseThread(ev)
      ThreadCache.set(cacheKey, v)
      return v
    }
  }

  /**
   * Assign props if undefined
   */
  static fixupEvent(e: NostrEvent) {
    e.tags ??= []
    e.created_at ??= 0
    e.content ??= ""
    e.id ??= ""
    e.kind ??= 0
    e.pubkey ??= ""
    e.sig ??= ""
  }

  static getType(kind: number) {
    const legacyReplaceable = [0, 3, 41]
    if (kind >= 30_000 && kind < 40_000) {
      return EventType.Addressable
    } else if (kind >= 10_000 && kind < 20_000) {
      return EventType.Replaceable
    } else if (legacyReplaceable.includes(kind)) {
      return EventType.Replaceable
    } else {
      return EventType.Regular
    }
  }

  static isReplaceable(kind: number) {
    const t = EventExt.getType(kind)
    return t === EventType.Replaceable || t === EventType.Addressable
  }

  static isAddressable(kind: number) {
    const t = EventExt.getType(kind)
    return t === EventType.Addressable
  }

  /**
   * Check that an event is structurally well-formed WITHOUT verifying the
   * Schnorr signature. Specifically: `sig` must be present, `tags` must be
   * an array, and addressable events must have a `"d"` tag.
   * Never throws; returns `false` for any malformed input.
   * Use `isValid` when cryptographic authenticity is required.
   */
  static isWellFormed(ev: NostrEvent) {
    if (ev.sig === undefined) return false
    if (!Array.isArray(ev.tags)) return false
    const type = EventExt.getType(ev.kind)
    if (type === EventType.Addressable) {
      if (!findTag(ev, "d")) return false
    }
    return true
  }

  /**
   * Check that an event is structurally well-formed AND has a valid Schnorr
   * signature. Use this wherever event authenticity matters (relay message
   * handlers, NIP-46, etc.).
   */
  static isValid(ev: NostrEvent) {
    return EventExt.isWellFormed(ev) && EventExt.verify(ev)
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
        return `${e.kind}:${e.pubkey}:${unwrap(findTag(e, "d"))}`
      case EventType.Replaceable:
        return `${e.kind}:${e.pubkey}`
      default:
        return e.id
    }
  }
}
