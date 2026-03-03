import { type CachedTable, isHex, removeUndefined } from '@snort/shared'
import debug from 'debug'
import type { RequestBuilder, SystemInterface, TaggedNostrEvent } from '.'

/** How long a key stays blacklisted before being retried (ms) */
const BlacklistTtl = 5 * 60 * 1_000 // 5 minutes

export abstract class BackgroundLoader<T extends { loaded: number; created: number }> {
  #system: SystemInterface
  readonly cache: CachedTable<T>
  #log = debug(this.name())
  /** Keys that returned no results, mapped to the timestamp (ms) they were blacklisted */
  #blacklist = new Map<string, number>()
  #destroyed = false

  /**
   * List of pubkeys to fetch metadata for
   */
  #wantsKeys = new Set<string>()

  /**
   * Custom loader function for fetching data from alternative sources
   */
  loaderFn?: (pubkeys: Array<string>) => Promise<Array<T>>

  constructor(system: SystemInterface, cache: CachedTable<T>) {
    this.#system = system
    this.cache = cache
    this.#FetchMetadata()
  }

  /**
   * Stop the background polling loop.
   * Call this when the loader is no longer needed to prevent timer leaks.
   */
  destroy() {
    this.#destroyed = true
  }

  /**
   * Name of this loader service
   */
  abstract name(): string

  /**
   * Handle fetched data
   */
  abstract onEvent(e: Readonly<TaggedNostrEvent>): T | undefined

  /**
   * Get expire time as uxix milliseconds
   */
  abstract getExpireCutoff(): number

  /**
   * Build subscription for missing keys
   */
  protected abstract buildSub(missing: Array<string>): RequestBuilder

  /**
   * Start requesting a set of keys to be loaded
   */
  TrackKeys(pk: string | Array<string>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (!isHex(p) || p.length !== 64) {
        continue
      }
      this.#wantsKeys.add(p)
    }
  }

  /**
   * Stop requesting a set of keys to be loaded
   */
  UntrackKeys(pk: string | Array<string>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      this.#wantsKeys.delete(p)
    }
  }

  /**
   * Get object from cache or fetch if missing
   */
  async fetch(key: string, timeoutMs = 30_000) {
    const existing = this.cache.get(key)
    if (existing) {
      return existing
    } else {
      return await new Promise<T>((resolve, reject) => {
        this.TrackKeys(key)
        const timeout = setTimeout(() => {
          this.cache.off('change', handler)
          this.UntrackKeys(key)
          reject(new Error('Fetch timeout'))
        }, timeoutMs)

        const handler = (keys: Array<string>) => {
          if (keys.includes(key)) {
            const existing = this.cache.getFromCache(key)
            if (existing) {
              clearTimeout(timeout)
              resolve(existing)
              this.UntrackKeys(key)
              this.cache.off('change', handler)
            } else {
              // should never happen
              clearTimeout(timeout)
              reject(new Error('Not found'))
            }
          }
        }
        this.cache.on('change', handler)
      })
    }
  }

  async #FetchMetadata() {
    if (this.#destroyed) return

    const now = Date.now()
    // Evict expired blacklist entries so keys are retried after BlacklistTtl
    for (const [k, ts] of this.#blacklist) {
      if (now - ts > BlacklistTtl) {
        this.#blacklist.delete(k)
      }
    }

    const loading = [...this.#wantsKeys].filter(a => !this.#blacklist.has(a))
    try {
      // Only buffer keys that aren't already in memory cache
      const needsBuffer = loading.filter(a => !this.cache.getFromCache(a))
      if (needsBuffer.length > 0) {
        await this.cache.buffer(needsBuffer)
      }

      const missing = loading.filter(a => (this.cache.getFromCache(a)?.loaded ?? 0) < this.getExpireCutoff())
      if (missing.length > 0) {
        this.#log('Fetching keys: %O', missing)
        const found = await this.#loadData(missing)
        const noResult = removeUndefined(missing.filter(a => !found.some(b => a === this.cache.key(b))))
        for (const k of noResult) {
          this.#blacklist.set(k, Date.now())
        }
      }
    } catch (e) {
      this.#log('Error: %O', e)
    } finally {
      if (!this.#destroyed) {
        // Use adaptive polling: 500ms if there's work, 2000ms if idle
        const nextPoll = loading.length > 0 ? 500 : 2000
        setTimeout(() => this.#FetchMetadata(), nextPoll)
      }
    }
  }

  async #loadData(missing: Array<string>) {
    this.#log('Loading data', missing)
    const ret: Array<T> = []
    const req = this.buildSub(missing)
    req.withOptions({ leaveOpen: false, skipCache: true, useSyncModule: true })

    const fres = await this.#system.Fetch(req, async x => {
      const results = removeUndefined(x.map(e => this.onEvent(e)))
      ret.push(...results)
      await Promise.all(results.map(a => this.cache.update(a)))
    })
    this.#log('Got data %O (%i/%i)', ret, fres.length, ret.length)
    return ret
  }
}
