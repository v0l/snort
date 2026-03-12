import { type CachedTable, isHex, removeUndefined } from "@snort/shared"
import debug from "debug"
import type { RequestBuilder, SystemInterface, TaggedNostrEvent } from "."

/** How long a key stays blacklisted before being retried (ms) */
const BlacklistTtl = 5 * 60 * 1_000 // 5 minutes

/** Maximum number of authors per relay filter to avoid relay rejections */
const ChunkSize = 100

/** Debounce intervals (ms) per priority tier */
const FlushIntervals = {
  high: 50,
  normal: 500,
  low: 5_000,
} as const

export type ProfilePriority = keyof typeof FlushIntervals

/**
 * Simple debounced flush scheduler.
 * Schedules a callback to fire after `delayMs` of inactivity.
 * Multiple `schedule()` calls within the window collapse into one flush.
 */
class DebouncedFlush {
  #timer: ReturnType<typeof setTimeout> | undefined
  readonly #delayMs: number
  readonly #fn: () => void

  constructor(delayMs: number, fn: () => void) {
    this.#delayMs = delayMs
    this.#fn = fn
  }

  schedule() {
    if (this.#timer !== undefined) return
    this.#timer = setTimeout(() => {
      this.#timer = undefined
      this.#fn()
    }, this.#delayMs)
  }

  cancel() {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }
  }
}

export abstract class BackgroundLoader<T extends { loaded: number; created: number }> {
  #system: SystemInterface
  readonly cache: CachedTable<T>
  #log = debug(this.name())
  /** Keys that returned no results, mapped to the timestamp (ms) they were blacklisted */
  #blacklist = new Map<string, number>()
  #destroyed = false

  /**
   * Per-priority sets of pubkeys to fetch.
   * A key present in a higher-priority set will be promoted on the next flush.
   */
  #wantHigh = new Set<string>()
  #wantNormal = new Set<string>()
  #wantLow = new Set<string>()

  /**
   * Keys currently being fetched from relays.
   * These are excluded from subsequent flush cycles until the fetch resolves.
   */
  #inFlight = new Set<string>()

  /** Debounced flush schedulers per priority tier */
  #flush: Record<ProfilePriority, DebouncedFlush>

  /**
   * Custom loader function for fetching data from alternative sources
   */
  loaderFn?: (pubkeys: Array<string>) => Promise<Array<T>>

  constructor(system: SystemInterface, cache: CachedTable<T>) {
    this.#system = system
    this.cache = cache
    this.#flush = {
      high: new DebouncedFlush(FlushIntervals.high, () => this.#dispatch("high")),
      normal: new DebouncedFlush(FlushIntervals.normal, () => this.#dispatch("normal")),
      low: new DebouncedFlush(FlushIntervals.low, () => this.#dispatch("low")),
    }
  }

  /**
   * Stop all pending flush timers.
   * Call this when the loader is no longer needed to prevent timer leaks.
   */
  destroy() {
    this.#destroyed = true
    this.#flush.high.cancel()
    this.#flush.normal.cancel()
    this.#flush.low.cancel()
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
   * Get expire time as unix milliseconds
   */
  abstract getExpireCutoff(): number

  /**
   * Build subscription for a chunk of missing keys
   */
  protected abstract buildSub(missing: Array<string>): RequestBuilder

  /**
   * Start requesting a set of keys to be loaded.
   * @param pk One or more hex pubkeys
   * @param priority Priority tier — higher tiers flush sooner (default: "normal")
   */
  TrackKeys(pk: string | Array<string>, priority: ProfilePriority = "normal") {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (!isHex(p) || p.length !== 64) continue
      this.#wantSetFor(priority).add(p)
    }
    if (!this.#destroyed) {
      this.#flush[priority].schedule()
    }
  }

  /**
   * Stop requesting a set of keys to be loaded
   */
  UntrackKeys(pk: string | Array<string>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      this.#wantHigh.delete(p)
      this.#wantNormal.delete(p)
      this.#wantLow.delete(p)
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
        this.TrackKeys(key, "high")
        const timeout = setTimeout(() => {
          unsub()
          this.UntrackKeys(key)
          reject(new Error("Fetch timeout"))
        }, timeoutMs)

        const unsub = this.cache.subscribe(key, () => {
          const found = this.cache.getFromCache(key)
          if (found) {
            clearTimeout(timeout)
            unsub()
            resolve(found)
            this.UntrackKeys(key)
          } else {
            clearTimeout(timeout)
            unsub()
            reject(new Error("Not found"))
          }
        })
      })
    }
  }

  /** Returns the want-set for the given priority tier */
  #wantSetFor(priority: ProfilePriority): Set<string> {
    switch (priority) {
      case "high":
        return this.#wantHigh
      case "normal":
        return this.#wantNormal
      case "low":
        return this.#wantLow
    }
  }

  /** All tracked keys across all priority tiers, highest priority first */
  get #allWanted(): Array<string> {
    return [...this.#wantHigh, ...this.#wantNormal, ...this.#wantLow]
  }

  /**
   * Dispatch a fetch cycle for all pending keys across all tiers.
   * Called by the debounced flush scheduler.
   */
  async #dispatch(triggeredBy: ProfilePriority) {
    if (this.#destroyed) return

    const now = Date.now()
    // Evict expired blacklist entries so keys are retried after BlacklistTtl
    for (const [k, ts] of this.#blacklist) {
      if (now - ts > BlacklistTtl) {
        this.#blacklist.delete(k)
      }
    }

    // Gather all keys that are not blacklisted and not currently in-flight
    const candidates = this.#allWanted.filter(a => !this.#blacklist.has(a) && !this.#inFlight.has(a))

    if (candidates.length === 0) {
      this.#log("Dispatch triggered by %s — no candidates", triggeredBy)
      return
    }

    try {
      // Buffer any keys not already in memory from persistent storage
      const needsBuffer = candidates.filter(a => !this.cache.getFromCache(a))
      if (needsBuffer.length > 0) {
        await this.cache.buffer(needsBuffer)
      }

      // Determine which keys actually need fetching from relays (expired or never loaded)
      const cutoff = this.getExpireCutoff()
      const missing = candidates.filter(a => (this.cache.getFromCache(a)?.loaded ?? 0) < cutoff)

      if (missing.length === 0) {
        this.#log("Dispatch triggered by %s — all candidates fresh", triggeredBy)
        return
      }

      this.#log("Fetching %d keys (triggered by %s)", missing.length, triggeredBy)

      // Mark all as in-flight before dispatching to prevent re-entry
      for (const k of missing) {
        this.#inFlight.add(k)
      }

      // Chunk into groups of ChunkSize and dispatch each chunk independently
      const chunks = chunk(missing, ChunkSize)
      const results = await Promise.all(chunks.map((c, i) => this.#loadChunk(c, i)))
      const found = results.flat()

      // Blacklist keys that returned no data
      const noResult = missing.filter(a => !found.some(b => a === this.cache.key(b)))
      for (const k of noResult) {
        this.#blacklist.set(k, Date.now())
      }
    } catch (e) {
      this.#log("Dispatch error: %O", e)
    } finally {
      // Release in-flight locks regardless of outcome
      // (keys were added above; we clear them all here)
      for (const k of this.#allWanted) {
        this.#inFlight.delete(k)
      }
    }
  }

  async #loadChunk(keys: Array<string>, chunkIndex: number): Promise<Array<T>> {
    this.#log("Loading chunk %d (%d keys)", chunkIndex, keys.length)
    const ret: Array<T> = []

    // Use a unique ID per chunk to avoid QueryManager collisions
    const req = this.#buildChunkSub(keys, chunkIndex)
    req.withOptions({ leaveOpen: false, skipCache: true, useSyncModule: true })

    await this.#system.Fetch(req, async x => {
      const results = removeUndefined(x.map(e => this.onEvent(e)))
      ret.push(...results)
      await Promise.all(results.map(a => this.cache.update(a)))
    })

    this.#log("Chunk %d: got %d results", chunkIndex, ret.length)
    return ret
  }

  /**
   * Wraps `buildSub` with a chunk-specific unique ID to prevent
   * QueryManager from conflating concurrent chunk requests.
   */
  #buildChunkSub(keys: Array<string>, chunkIndex: number): RequestBuilder {
    const req = this.buildSub(keys)
    // Assign a unique ID so each chunk gets its own Query in the QueryManager
    req.id = `${this.name()}-${Date.now()}-${chunkIndex}`
    return req
  }
}

/** Split an array into chunks of at most `size` elements */
function chunk<T>(arr: Array<T>, size: number): Array<Array<T>> {
  const out: Array<Array<T>> = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}
