/**
 * Tests for WorkerBaseCache:
 *   - update() timestamp guard: newer created wins, stale events are rejected
 *   - subscribe(): O(1) per-key notifications
 *   - set() / bulkSet() fire per-key listeners
 */

import { describe, expect, test } from "bun:test"
import type { CachedBase, CacheRelay, NostrEvent, OkResponse, ReqCommand, TaggedNostrEvent } from "@snort/system"
import { WorkerBaseCache } from "../src/Cache/worker-cached"

// ---------------------------------------------------------------------------
// Minimal CacheRelay mock — returns empty arrays for queries
// ---------------------------------------------------------------------------

const mockRelay: CacheRelay = {
  async event(ev: TaggedNostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", relay: "", event: ev }
  },
  async query(_req: ReqCommand): Promise<TaggedNostrEvent[]> {
    return []
  },
  async delete(_req: ReqCommand): Promise<string[]> {
    return []
  },
}

// ---------------------------------------------------------------------------
// Concrete WorkerBaseCache for testing
// ---------------------------------------------------------------------------

type TestEntry = CachedBase & { name: string }

class TestWorkerCache extends WorkerBaseCache<TestEntry> {
  constructor() {
    super(0, mockRelay)
  }

  name() {
    return "TestWorkerCache"
  }
  maxSize() {
    return 1000
  }

  mapper(ev: NostrEvent): TestEntry | undefined {
    return undefined
  }
}

function entry(pubkey: string, created: number, loaded: number, name = "alice"): TestEntry {
  return { pubkey, created, loaded, name }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WorkerBaseCache.update() — timestamp guard", () => {
  test('first entry is stored and returns "new"', async () => {
    const cache = new TestWorkerCache()
    const result = await cache.update(entry("pk1", 100, 1000))
    expect(result).toBe("new")
    expect(cache.getFromCache("pk1")?.created).toBe(100)
  })

  test('entry with newer created timestamp overwrites and returns "updated"', async () => {
    const cache = new TestWorkerCache()
    await cache.update(entry("pk1", 100, 1000, "old"))
    const result = await cache.update(entry("pk1", 200, 2000, "new"))
    expect(result).toBe("updated")
    expect(cache.getFromCache("pk1")?.name).toBe("new")
  })

  test('entry with older created timestamp is rejected and returns "no_change"', async () => {
    const cache = new TestWorkerCache()
    await cache.update(entry("pk1", 200, 2000, "newer"))
    const result = await cache.update(entry("pk1", 100, 1000, "older"))
    expect(result).toBe("no_change")
    // Value should remain the newer entry
    expect(cache.getFromCache("pk1")?.name).toBe("newer")
  })

  test("entry with same created but older loaded is rejected", async () => {
    const cache = new TestWorkerCache()
    await cache.update(entry("pk1", 100, 2000, "newer-load"))
    const result = await cache.update(entry("pk1", 100, 1000, "older-load"))
    expect(result).toBe("no_change")
    expect(cache.getFromCache("pk1")?.name).toBe("newer-load")
  })

  test("entry with same created and same loaded is treated as no_change", async () => {
    const cache = new TestWorkerCache()
    await cache.update(entry("pk1", 100, 1000, "first"))
    const result = await cache.update(entry("pk1", 100, 1000, "duplicate"))
    expect(result).toBe("no_change")
    expect(cache.getFromCache("pk1")?.name).toBe("first")
  })
})

describe("WorkerBaseCache.bulkGet() loaded time", () => {
  const ev = (created_at: number) =>
    ({ id: "i", pubkey: "pk1", created_at, kind: 0, tags: [], content: "{}", sig: "" }) as NostrEvent

  class ReadCache extends WorkerBaseCache<TestEntry> {
    constructor(events: NostrEvent[]) {
      super(0, { ...mockRelay, query: async () => events as TaggedNostrEvent[] })
    }
    name() {
      return "ReadCache"
    }
    maxSize() {
      return 10
    }
    mapper(e: NostrEvent) {
      return { pubkey: e.pubkey, created: e.created_at, loaded: 0, name: "x" }
    }
  }

  test("reading a cached entry does not make it look freshly loaded", async () => {
    const cache = new ReadCache([ev(100)])
    const a = await cache.bulkGet(["pk1"])
    expect(a[0].loaded).toBe(0)
    await cache.update({ pubkey: "pk1", created: 100, loaded: 5000, name: "x" })
    const b = await cache.bulkGet(["pk1"])
    expect(b[0].loaded).toBe(5000)
    expect(cache.getFromCache("pk1")?.loaded).toBe(5000)
  })
})

describe("WorkerBaseCache persisted loaded time", () => {
  const kv = new Map<string, unknown>()
  const relay = {
    ...mockRelay,
    query: async (req: ReqCommand) =>
      (req[2] as { ids_only?: boolean }).ids_only
        ? ([] as never)
        : ([{ id: "i", pubkey: "pk1", created_at: 100, kind: 0, tags: [], content: "{}", sig: "" }] as TaggedNostrEvent[]),
    syncState: {
      get: async (k: string) => kv.get(k) as never,
      set: async (k: string, v: unknown) => {
        kv.set(k, v)
      },
    },
  } as CacheRelay

  class Persisting extends WorkerBaseCache<TestEntry> {
    constructor() {
      super(0, relay)
    }
    name() {
      return "Persisting"
    }
    maxSize() {
      return 10
    }
    persistLoaded() {
      return true
    }
    mapper(e: NostrEvent) {
      return { pubkey: e.pubkey, created: e.created_at, loaded: 0, name: "x" }
    }
  }

  test("loaded time survives a reload", async () => {
    const first = new Persisting()
    await first.update({ pubkey: "pk1", created: 100, loaded: 7000, name: "x" })
    await new Promise(r => setTimeout(r, 2100))
    const second = new Persisting()
    await second.preload()
    const got = await second.bulkGet(["pk1"])
    expect(got[0].loaded).toBe(7000)
  })
})

describe("WorkerBaseCache.subscribe()", () => {
  test("subscriber is called when key is set", async () => {
    const cache = new TestWorkerCache()
    let callCount = 0

    cache.subscribe("pk-a", () => {
      callCount++
    })
    await cache.set(entry("pk-a", 1, 1))

    expect(callCount).toBe(1)
  })

  test("subscriber is NOT called for a different key", async () => {
    const cache = new TestWorkerCache()
    let callCount = 0

    cache.subscribe("pk-a", () => {
      callCount++
    })
    await cache.set(entry("pk-b", 1, 1))

    expect(callCount).toBe(0)
  })

  test("unsubscribe prevents further notifications", async () => {
    const cache = new TestWorkerCache()
    let callCount = 0

    const unsub = cache.subscribe("pk-a", () => {
      callCount++
    })
    await cache.set(entry("pk-a", 1, 1)) // fires
    unsub()
    await cache.set(entry("pk-a", 2, 2)) // should not fire

    expect(callCount).toBe(1)
  })

  test("bulkSet fires subscriber for each relevant key", async () => {
    const cache = new TestWorkerCache()
    let countA = 0
    let countB = 0

    cache.subscribe("pa", () => {
      countA++
    })
    cache.subscribe("pb", () => {
      countB++
    })

    await cache.bulkSet([
      entry("pa", 1, 1, "a"),
      entry("pb", 1, 1, "b"),
      entry("pc", 1, 1, "c"), // no subscriber
    ])

    expect(countA).toBe(1)
    expect(countB).toBe(1)
  })

  test("update() with new data triggers subscriber", async () => {
    const cache = new TestWorkerCache()
    let callCount = 0

    cache.subscribe("pk-u", () => {
      callCount++
    })
    await cache.update(entry("pk-u", 1, 1, "first")) // new
    await cache.update(entry("pk-u", 2, 2, "second")) // updated

    expect(callCount).toBe(2)
  })

  test("update() with stale data does NOT trigger subscriber", async () => {
    const cache = new TestWorkerCache()
    let callCount = 0

    cache.subscribe("pk-u", () => {
      callCount++
    })
    await cache.update(entry("pk-u", 10, 10, "current")) // new
    await cache.update(entry("pk-u", 5, 5, "old")) // rejected — stale

    expect(callCount).toBe(1)
  })
})
