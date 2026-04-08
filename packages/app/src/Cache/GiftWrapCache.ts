import { EventKind, type EventPublisher, type NostrEvent, type TaggedNostrEvent } from "@snort/system"
import type { CacheRelay } from "@snort/system"

import { findTag, unwrap } from "@/Utils"

import { RefreshFeedCache, type TWithCreated } from "./RefreshFeedCache"

export interface UnwrappedGift {
  id: string
  to: string
  created_at: number
  inner: NostrEvent
  tags?: Array<Array<string>>
}

const DecryptedContentCache = new Map<string, string>()

export function getCachedDecryptedContent(id: string): string | undefined {
  return DecryptedContentCache.get(id)
}

export function setCachedDecryptedContent(id: string, content: string) {
  DecryptedContentCache.set(id, content)
}

const NIP44_MIN_PAYLOAD_LEN = 132

function isValidNip44Content(content: string): boolean {
  return content.length >= NIP44_MIN_PAYLOAD_LEN
}

export class GiftWrapCache extends RefreshFeedCache<UnwrappedGift> {
  #relay: CacheRelay | undefined
  #persistedIds: Set<string> = new Set()

  constructor() {
    super("GiftWrapCache")
  }

  setRelay(relay: CacheRelay) {
    this.#relay = relay
  }

  key(of: UnwrappedGift): string {
    return of.id
  }

  buildSub(): void {}

  takeSnapshot(): Array<UnwrappedGift> {
    return [...this.cache.values()]
  }

  override async preload(): Promise<void> {
    await super.preload()
  }

  override async onEvent(evs: Readonly<Array<TaggedNostrEvent>>, _: string, pub?: EventPublisher) {
    if (!pub) return

    const fresh = evs.filter(v => !this.#persistedIds.has(v.id) && !this.cache.has(v.id))
    if (fresh.length === 0) return

    const valid = fresh.filter(v => isValidNip44Content(v.content))

    const unwrapped = (
      await Promise.all(
        valid.map(async v => {
          try {
            return {
              id: v.id,
              to: findTag(v, "p"),
              created_at: v.created_at,
              inner: await pub.unwrapGift(v),
              raw: v,
            } as UnwrappedGift & { raw: TaggedNostrEvent }
          } catch (e) {
            console.debug(e, v)
          }
        }),
      )
    )
      .filter(a => a !== undefined)
      .map(unwrap)

    const failed = new Set<number>()
    for (let i = 0; i < unwrapped.length; i++) {
      const u = unwrapped[i]
      if (u.inner.kind === EventKind.SealedRumor) {
        try {
          if (!isValidNip44Content(u.inner.content)) {
            failed.add(i)
            continue
          }
          const unsealed = await pub.unsealRumor(u.inner)
          u.tags = unsealed.tags
        } catch (e) {
          console.debug("Failed to unseal rumor", u.id, e)
          failed.add(i)
        }
      }
    }

    const good = unwrapped.filter((_, i) => !failed.has(i))

    if (this.#relay) {
      const toPersist = good.filter(u => !this.#persistedIds.has(u.id))
      if (toPersist.length > 0) {
        try {
          await Promise.all(toPersist.map(u => this.#relay!.event(u.raw)))
          for (const u of toPersist) {
            this.#persistedIds.add(u.id)
          }
        } catch (e) {
          console.warn("GiftWrapCache: failed to persist to worker relay", e)
        }
      }
    }

    const cleaned = good.map(({ raw, ...rest }) => rest)
    await this.bulkSet(cleaned)
  }

  async loadPersistedAndDecrypt(pub: EventPublisher): Promise<void> {
    if (!this.#relay) return
    try {
      const existing = await this.#relay.query(["REQ", "giftwrap-load", { kinds: [EventKind.GiftWrap] }])
      for (const ev of existing) {
        this.#persistedIds.add(ev.id)
      }
      const newEvs = existing.filter(a => !this.cache.has(a.id))
      if (newEvs.length === 0) return

      await this.onEvent(newEvs, "", pub)
    } catch (e) {
      console.warn("GiftWrapCache: failed to load persisted gift wraps", e)
    }
  }

  override async clear(): Promise<void> {
    if (this.#relay) {
      try {
        await this.#relay.delete(["REQ", "giftwrap-clear", { kinds: [EventKind.GiftWrap] }])
      } catch (e) {
        console.warn("GiftWrapCache: failed to clear worker relay", e)
      }
    }
    this.#persistedIds.clear()
    DecryptedContentCache.clear()
    await super.clear()
  }

  search(): Promise<TWithCreated<UnwrappedGift>[]> {
    throw new Error("Method not implemented.")
  }
}
