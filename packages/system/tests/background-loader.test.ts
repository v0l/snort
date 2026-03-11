/**
 * Tests for the refactored BackgroundLoader:
 *   - Priority tiers (high / normal / low) with separate debounce timers
 *   - Chunking: authors split into groups of ≤100 per relay filter
 *   - In-flight deduplication: a key being fetched is never re-dispatched
 *   - Blacklisting: keys with no results are skipped for BlacklistTtl
 *   - Fresh-cache skip: keys that are within the expire cutoff are not fetched
 *   - UntrackKeys: removes from all priority sets
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CachedTable, CacheEvents } from '@snort/shared'
import { EventEmitter } from 'eventemitter3'
import type { RequestBuilder, SystemInterface, TaggedNostrEvent } from '../src'
import { BackgroundLoader, type ProfilePriority } from '../src/background-loader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/** Generate a valid 64-char hex pubkey */
function pubkey(seed: number): string {
  return seed.toString(16).padStart(64, '0')
}

/** Generate 'count' unique pubkeys starting from offset */
function pubkeys(count: number, offset = 0): string[] {
  return Array.from({ length: count }, (_, i) => pubkey(offset + i + 1))
}

// ---------------------------------------------------------------------------
// Minimal in-memory CachedTable implementation
// ---------------------------------------------------------------------------

type TestEntry = { pubkey: string; loaded: number; created: number }

class MemoryCache extends EventEmitter<CacheEvents<TestEntry>> implements CachedTable<TestEntry> {
  #data = new Map<string, TestEntry>()
  #keyListeners = new Map<string, Set<() => void>>()

  key(of: TestEntry) {
    return of.pubkey
  }

  getFromCache(k?: string) {
    return k ? this.#data.get(k) : undefined
  }

  async get(k?: string) {
    return this.getFromCache(k)
  }

  async bulkGet(keys: string[]) {
    return keys.map(k => this.#data.get(k)).filter(Boolean) as TestEntry[]
  }

  async set(obj: TestEntry) {
    this.#data.set(obj.pubkey, obj)
    this.emit('change', [obj.pubkey])
    this.#notifyKey(obj.pubkey)
  }

  async bulkSet(objs: TestEntry[] | Readonly<TestEntry[]>) {
    for (const obj of objs) {
      this.#data.set(obj.pubkey, obj)
    }
    const keys = objs.map(o => o.pubkey)
    this.emit('change', keys)
    for (const k of keys) this.#notifyKey(k)
  }

  async update(m: TestEntry) {
    const existing = this.#data.get(m.pubkey)
    if (existing && existing.created >= m.created) return 'no_change' as const
    await this.set(m)
    return existing ? ('updated' as const) : ('new' as const)
  }

  async buffer(keys: string[]) {
    // in-memory only; nothing on "disk"
    return keys.filter(k => !this.#data.has(k))
  }

  async preload() {}
  keysOnTable() {
    return [...this.#data.keys()]
  }
  async clear() {
    this.#data.clear()
  }
  snapshot() {
    return [...this.#data.values()]
  }
  async search() {
    return []
  }

  subscribe(key: string, cb: () => void): () => void {
    let s = this.#keyListeners.get(key)
    if (!s) {
      s = new Set()
      this.#keyListeners.set(key, s)
    }
    s.add(cb)
    return () => {
      const set = this.#keyListeners.get(key)
      if (set) {
        set.delete(cb)
        if (set.size === 0) this.#keyListeners.delete(key)
      }
    }
  }

  #notifyKey(key: string) {
    const listeners = this.#keyListeners.get(key)
    if (listeners) {
      for (const cb of listeners) cb()
    }
  }

  /** Seed a key with a loaded timestamp so it appears fresh */
  seed(pk: string, loadedMs: number, createdSecs = 1) {
    this.#data.set(pk, { pubkey: pk, loaded: loadedMs, created: createdSecs })
  }
}

// ---------------------------------------------------------------------------
// Concrete BackgroundLoader for testing
// ---------------------------------------------------------------------------

/** Captures every RequestBuilder passed to buildSub */
class TestLoader extends BackgroundLoader<TestEntry> {
  fetchCalls: Array<string[]> = [] // authors per Fetch call
  fetchResolve: ((results: TestEntry[]) => void) | undefined

  // Return Fetch call index → authors
  subIds: string[] = []

  constructor(system: SystemInterface, cache: CachedTable<TestEntry>) {
    super(system, cache)
  }

  override name() {
    return 'TestLoader'
  }
  override onEvent(e: Readonly<TaggedNostrEvent>): TestEntry | undefined {
    return undefined
  }
  override getExpireCutoff() {
    return Date.now() - 1
  } // anything not loaded in the last ms is "expired"

  override buildSub(missing: string[]): RequestBuilder {
    // Return a minimal stub that satisfies the RequestBuilder shape used by #buildChunkSub
    return {
      id: 'test-sub',
      withOptions: () => ({}),
      withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
    } as unknown as RequestBuilder
  }
}

// ---------------------------------------------------------------------------
// Minimal mock system — captures Fetch calls
// ---------------------------------------------------------------------------

type FetchCallback = (evs: TaggedNostrEvent[]) => Promise<void>

function makeMockSystem(onFetch: (req: RequestBuilder, authors: string[]) => Promise<TestEntry[]>) {
  return {
    Fetch: async (req: RequestBuilder, cb?: FetchCallback) => {
      // Extract the authors the loader put into the filter — we capture them from
      // the stub filter built in TestLoader.buildSub above; instead, we read
      // the req.id which embeds the chunk index, and the test records authors
      // via a spy.
      if (cb) await cb([])
      return []
    },
  } as unknown as SystemInterface
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BackgroundLoader — priority tiers', () => {
  let cache: MemoryCache
  let fetchedBatches: string[][]
  let system: SystemInterface
  let loader: TestLoader

  beforeEach(() => {
    cache = new MemoryCache()
    fetchedBatches = []

    // Intercept Fetch calls by overriding buildSub to record authors
    system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface
  })

  afterEach(() => {
    loader?.destroy()
  })

  test('TrackKeys with high priority schedules flush within 50ms', async () => {
    let dispatched = false
    system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        dispatched = true
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    loader = new TestLoader(system, cache)
    loader.TrackKeys(pubkey(1), 'high')

    // Should not have dispatched immediately (debounced)
    expect(dispatched).toBe(false)

    // After 60ms the 50ms debounce should have fired
    await sleep(100)
    expect(dispatched).toBe(true)
  })

  test('TrackKeys with normal priority flushes after 500ms', async () => {
    let dispatched = false
    system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        dispatched = true
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    loader = new TestLoader(system, cache)
    loader.TrackKeys(pubkey(1), 'normal')

    // At 200ms the normal 500ms debounce should NOT have fired yet
    await sleep(200)
    expect(dispatched).toBe(false)

    // After 600ms total it should have fired
    await sleep(400)
    expect(dispatched).toBe(true)
  })

  test('multiple TrackKeys calls within debounce window collapse into one dispatch', async () => {
    let fetchCount = 0
    system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        fetchCount++
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    loader = new TestLoader(system, cache)

    // Add 5 keys in rapid succession — all within the 50ms high-priority window
    for (const pk of pubkeys(5)) {
      loader.TrackKeys(pk, 'high')
    }

    await sleep(100)

    // All 5 keys fit in one chunk (< 100), so exactly 1 Fetch call
    expect(fetchCount).toBe(1)
  })

  test('UntrackKeys removes key from all priority sets', async () => {
    const fetchedKeys: string[] = []
    const pk1 = pubkey(1)
    const pk2 = pubkey(2)

    // Spy on buildSub to capture which keys are fetched
    class SpyLoader extends TestLoader {
      override buildSub(missing: string[]) {
        fetchedKeys.push(...missing)
        return super.buildSub(missing)
      }
    }

    loader = new SpyLoader(system, cache)
    loader.TrackKeys(pk1, 'high')
    loader.TrackKeys(pk2, 'high')
    loader.UntrackKeys(pk1)

    await sleep(100)

    expect(fetchedKeys).not.toContain(pk1)
    expect(fetchedKeys).toContain(pk2)
  })

  test('destroy() prevents dispatch after being called', async () => {
    let fetchCount = 0
    system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        fetchCount++
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    loader = new TestLoader(system, cache)
    loader.TrackKeys(pubkey(1), 'high')
    loader.destroy()

    await sleep(100)
    expect(fetchCount).toBe(0)
  })
})

describe('BackgroundLoader — chunking', () => {
  afterEach(() => {})

  test('101 keys produce 2 Fetch calls (chunks of 100)', async () => {
    const cache = new MemoryCache()
    const fetchCalls: number[] = []

    const system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        fetchCalls.push(1)
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    class ChunkSpyLoader extends BackgroundLoader<TestEntry> {
      override name() {
        return 'ChunkSpyLoader'
      }
      override onEvent() {
        return undefined
      }
      override getExpireCutoff() {
        return Date.now() - 1
      }
      override buildSub(missing: string[]): RequestBuilder {
        return {
          id: 'chunk-sub',
          withOptions: () => ({}),
          withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
        } as unknown as RequestBuilder
      }
    }

    const loader = new ChunkSpyLoader(system, cache)
    // Track 101 keys — should produce 2 chunks (100 + 1)
    loader.TrackKeys(pubkeys(101), 'high')

    await sleep(150)
    loader.destroy()

    expect(fetchCalls.length).toBe(2)
  })

  test('100 keys produce exactly 1 Fetch call', async () => {
    const cache = new MemoryCache()
    const fetchCalls: number[] = []

    const system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        fetchCalls.push(1)
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    class ChunkSpyLoader extends BackgroundLoader<TestEntry> {
      override name() {
        return 'ChunkSpyLoader100'
      }
      override onEvent() {
        return undefined
      }
      override getExpireCutoff() {
        return Date.now() - 1
      }
      override buildSub(missing: string[]): RequestBuilder {
        return {
          id: 'chunk-sub',
          withOptions: () => ({}),
          withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
        } as unknown as RequestBuilder
      }
    }

    const loader = new ChunkSpyLoader(system, cache)
    loader.TrackKeys(pubkeys(100), 'high')

    await sleep(150)
    loader.destroy()

    expect(fetchCalls.length).toBe(1)
  })

  test('each chunk gets a unique RequestBuilder ID', async () => {
    const cache = new MemoryCache()
    const seenIds = new Set<string>()

    const system = {
      Fetch: async (req: RequestBuilder, cb?: FetchCallback) => {
        seenIds.add(req.id)
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    class IdSpyLoader extends BackgroundLoader<TestEntry> {
      override name() {
        return 'IdSpyLoader'
      }
      override onEvent() {
        return undefined
      }
      override getExpireCutoff() {
        return Date.now() - 1
      }
      override buildSub(_missing: string[]): RequestBuilder {
        // Return a mutable stub
        const stub = {
          id: 'initial',
          withOptions: () => stub,
          withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
        }
        return stub as unknown as RequestBuilder
      }
    }

    const loader = new IdSpyLoader(system, cache)
    // 250 keys → 3 chunks
    loader.TrackKeys(pubkeys(250), 'high')

    await sleep(150)
    loader.destroy()

    // All 3 chunk IDs must be distinct
    expect(seenIds.size).toBe(3)
  })
})

describe('BackgroundLoader — in-flight deduplication', () => {
  test('a key being fetched is not included in a second concurrent dispatch', async () => {
    const cache = new MemoryCache()
    const fetchedBatches: string[][] = []
    let resolveFetch!: () => void
    const fetchLatch = new Promise<void>(resolve => {
      resolveFetch = resolve
    })

    // First fetch call hangs until we release the latch
    let callCount = 0
    const system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        callCount++
        if (callCount === 1) {
          // Hang the first fetch so the key stays in-flight
          await fetchLatch
        }
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    class InFlightSpyLoader extends BackgroundLoader<TestEntry> {
      override name() {
        return 'InFlightSpyLoader'
      }
      override onEvent() {
        return undefined
      }
      override getExpireCutoff() {
        return Date.now() - 1
      }
      override buildSub(missing: string[]): RequestBuilder {
        fetchedBatches.push([...missing])
        const stub = {
          id: 'inflight-sub',
          withOptions: () => stub,
          withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
        }
        return stub as unknown as RequestBuilder
      }
    }

    const loader = new InFlightSpyLoader(system, cache)
    const pk = pubkey(42)

    // First TrackKeys — starts the first (hanging) fetch
    loader.TrackKeys(pk, 'high')
    await sleep(80) // let the 50ms debounce fire and first fetch start

    // Second TrackKeys — fires a second flush while first fetch is still in-flight
    loader.TrackKeys(pk, 'high')
    await sleep(80)

    // Release the latch so the first fetch can complete
    resolveFetch()
    await sleep(50)

    loader.destroy()

    // The key should only appear in the first batch; the second dispatch
    // should have found it in-flight and skipped it
    const allFetched = fetchedBatches.flat()
    const countOfPk = allFetched.filter(k => k === pk).length
    expect(countOfPk).toBe(1)
  })
})

describe('BackgroundLoader — fresh cache skip', () => {
  test('a key loaded recently is not re-fetched', async () => {
    const cache = new MemoryCache()
    let fetchCount = 0

    const system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        fetchCount++
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    class FreshSkipLoader extends BackgroundLoader<TestEntry> {
      override name() {
        return 'FreshSkipLoader'
      }
      override onEvent() {
        return undefined
      }
      // Cutoff is 1 hour ago — anything loaded more recently than that is fresh
      override getExpireCutoff() {
        return Date.now() - 60 * 60 * 1_000
      }
      override buildSub(missing: string[]): RequestBuilder {
        const stub = {
          id: 'fresh-sub',
          withOptions: () => stub,
          withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
        }
        return stub as unknown as RequestBuilder
      }
    }

    const pk = pubkey(99)
    // Seed as loaded "just now"
    cache.seed(pk, Date.now(), 1)

    const loader = new FreshSkipLoader(system, cache)
    loader.TrackKeys(pk, 'high')

    await sleep(100)
    loader.destroy()

    // Should not have fetched since the cache entry is fresh
    expect(fetchCount).toBe(0)
  })

  test('a key loaded before the expire cutoff IS re-fetched', async () => {
    const cache = new MemoryCache()
    let fetchCount = 0

    const system = {
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        fetchCount++
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    class ExpiredLoader extends BackgroundLoader<TestEntry> {
      override name() {
        return 'ExpiredLoader'
      }
      override onEvent() {
        return undefined
      }
      // Cutoff is 1 hour ago — anything loaded more than 1 hour ago is expired
      override getExpireCutoff() {
        return Date.now() - 60 * 60 * 1_000
      }
      override buildSub(missing: string[]): RequestBuilder {
        const stub = {
          id: 'expired-sub',
          withOptions: () => stub,
          withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
        }
        return stub as unknown as RequestBuilder
      }
    }

    const pk = pubkey(100)
    // Seed as loaded 2 hours ago — expired
    cache.seed(pk, Date.now() - 2 * 60 * 60 * 1_000, 1)

    const loader = new ExpiredLoader(system, cache)
    loader.TrackKeys(pk, 'high')

    await sleep(100)
    loader.destroy()

    expect(fetchCount).toBe(1)
  })
})

describe('BackgroundLoader — blacklisting', () => {
  test('keys that return no results are not re-fetched in the same session', async () => {
    const cache = new MemoryCache()
    const fetchedBatches: string[][] = []

    const system = {
      // Returns empty — simulates relay knowing nothing about this pubkey
      Fetch: async (_req: RequestBuilder, cb?: FetchCallback) => {
        if (cb) await cb([])
        return []
      },
    } as unknown as SystemInterface

    class BlacklistSpyLoader extends BackgroundLoader<TestEntry> {
      override name() {
        return 'BlacklistSpyLoader'
      }
      override onEvent() {
        return undefined
      }
      override getExpireCutoff() {
        return Date.now() - 1
      }
      override buildSub(missing: string[]): RequestBuilder {
        fetchedBatches.push([...missing])
        const stub = {
          id: 'bl-sub',
          withOptions: () => stub,
          withFilter: () => ({ kinds: () => ({ authors: () => ({}) }) }),
        }
        return stub as unknown as RequestBuilder
      }
    }

    const pk = pubkey(77)
    const loader = new BlacklistSpyLoader(system, cache)

    // First TrackKeys — key has no result → gets blacklisted
    loader.TrackKeys(pk, 'high')
    await sleep(100)

    const firstBatchCount = fetchedBatches.length

    // Second TrackKeys — key should be blacklisted, no second fetch
    loader.TrackKeys(pk, 'high')
    await sleep(100)

    loader.destroy()

    // Total batches should be the same — blacklisted key was not re-queued
    expect(fetchedBatches.length).toBe(firstBatchCount)
  })
})
