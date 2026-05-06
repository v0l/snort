import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { CachedTable } from "@snort/shared"
import { EventEmitter } from "eventemitter3"
import { SocialGraph } from "nostr-social-graph"
import type { RelayInfoDocument } from "../src"
import type { CachedMetadata, UsersFollows } from "../src/cache"
import type { RelaySettings } from "../src/connection"
import type { ConnectionPool, ConnectionPoolEvents, ConnectionType, ConnectionTypeEvents } from "../src/connection-pool"
import type { NostrEvent, OkResponse, ReqCommand, TaggedNostrEvent } from "../src/nostr"
import type { RelayMetadataLoader } from "../src/outbox"
import type { ProfileLoaderService } from "../src/profile-cache"
import { QueryManager } from "../src/query-manager"
import { DefaultOptimizer } from "../src/query-optimizer"
import { RequestBuilder } from "../src/request-builder"
import type { SystemConfig, SystemInterface } from "../src/system"

function createEv(
  id: string,
  kind = 1,
  created_at = 100,
  pubkey = "aa",
  tags: string[][] = [],
  relays: string[] = [],
): TaggedNostrEvent {
  return { id, kind, created_at, pubkey, tags, content: "", sig: "", relays }
}

// 64-char hex pubkeys (required by RequestFilterBuilder.authors)
const PUBKEY_A = "00000000000000000000000000000000000000000000000000000000000000aa"
const PUBKEY_B = "00000000000000000000000000000000000000000000000000000000000000bb"

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

class MockConnection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
  readonly id = crypto.randomUUID()
  readonly address: string
  info: RelayInfoDocument | undefined = undefined
  settings: RelaySettings = { read: true, write: true }
  ephemeral = false
  #open: boolean
  #down = false
  sentRequests: Array<ReqCommand> = []
  closedRequests: string[] = []

  constructor(address: string, open = true) {
    super()
    this.address = address
    this.#open = open
  }

  get isOpen() {
    return this.#open
  }
  get isDown() {
    return this.#down
  }
  get activeSubscriptions() {
    return this.sentRequests.filter(r => r[0] === "REQ").length
  }
  get maxSubscriptions() {
    return 20
  }

  open() {
    this.#open = true
    this.emit("connected", false)
    this.emit("change")
  }

  markDown() {
    this.#down = true
  }

  async connect() {}
  close() {}
  async publish(ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", relay: this.address, event: ev }
  }

  request(req: ReqCommand, cbSent?: () => void) {
    if (this.#open) {
      this.sentRequests.push(req)
      cbSent?.()
    }
  }

  closeRequest(id: string) {
    this.closedRequests.push(id)
  }
  sendRaw(_obj: object) {}
}

class MockPool extends EventEmitter<ConnectionPoolEvents> implements ConnectionPool {
  #conns = new Map<string, MockConnection>()

  add(c: MockConnection) {
    this.#conns.set(c.address, c)
  }

  getConnection(id: string) {
    return this.#conns.get(id)
  }

  async connect(address: string) {
    return this.#conns.get(address)
  }
  disconnect(_a: string) {}
  async broadcast(): Promise<OkResponse[]> {
    return []
  }
  async broadcastTo(_a: string, ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", relay: _a, event: ev }
  }

  *[Symbol.iterator]() {
    yield* this.#conns
  }
}

function makeSystem(pool: MockPool): SystemInterface {
  const config: SystemConfig = {
    relays: { preload: async () => {} } as unknown as CachedTable<any>,
    profiles: {} as CachedTable<CachedMetadata>,
    contactLists: {} as CachedTable<UsersFollows>,
    optimizer: DefaultOptimizer,
    checkSigs: false,
    automaticOutboxModel: false,
    buildFollowGraph: false,
    fallbackSync: "since",
    socialGraphInstance: new SocialGraph("00".repeat(32)),
    disableSyncModule: true,
  }
  return {
    pool,
    config,
    cacheRelay: undefined,
    requestRouter: undefined,
    checkSigs: false,
    optimizer: DefaultOptimizer,
    relayLoader: { TrackKeys: () => {} } as unknown as RelayMetadataLoader,
    profileLoader: {} as ProfileLoaderService,
    userFollowsCache: {} as CachedTable<UsersFollows>,
    traceTimeline: undefined,
    async Init() {},
    GetQuery: () => undefined,
    Query: () => {
      throw new Error("not used")
    },
    Fetch: () => Promise.resolve([]),
    async ConnectToRelay() {},
    DisconnectRelay() {},
    HandleEvent() {},
    async BroadcastEvent() {
      return []
    },
    async WriteOnceToRelay() {
      return { ok: true, id: "", relay: "", event: {} as NostrEvent }
    },
    emit: () => false,
    on: () => ({}) as any,
    off: () => ({}) as any,
    once: () => ({}) as any,
    removeAllListeners: () => ({}) as any,
    listeners: () => [],
    listenerCount: () => 0,
    eventNames: () => [],
    addListener: () => ({}) as any,
    removeListener: () => ({}) as any,
  } as unknown as SystemInterface
}

/**
 * Create a query, start it, let the QueryManager process the filters through
 * to the mock connection, then EOSE all traces so they finish.
 * Returns the query object.
 */
async function setupEosedQuery(
  qm: QueryManager,
  pool: MockPool,
  conn: MockConnection,
  id: string,
  buildFilters: (rb: RequestBuilder) => void,
  opts?: { keepAlive?: number },
) {
  const rb = new RequestBuilder(id)
  rb.withOptions({ groupingDelay: 0, keepAlive: opts?.keepAlive })
  buildFilters(rb)
  const q = qm.query(rb)
  q.start()
  await sleep(50)

  // EOSE all traces so they finish
  for (const trace of q.traces) {
    conn.emit("eose", trace.id)
  }
  return q
}

describe("Query keepAlive", () => {
  let pool: MockPool
  let system: SystemInterface
  let qm: QueryManager

  beforeEach(() => {
    pool = new MockPool()
    system = makeSystem(pool)
    qm = new QueryManager(system)
  })

  afterEach(() => {
    qm.destroy()
  })

  test("default cancel uses 1s TTL", () => {
    const rb = new RequestBuilder("default-ttl")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.cancel()
    expect(q.canRemove()).toBe(false)
  })

  test("keepAlive extends the cancel deadline beyond default 1s", async () => {
    const rb = new RequestBuilder("keepalive-ttl")
    rb.withOptions({ groupingDelay: 0, keepAlive: 5000 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.cancel()

    // Should not be removable after 2s (default would be 1s)
    await sleep(2100)
    expect(q.canRemove()).toBe(false)
  })

  test("uncancel clears cancelAt", () => {
    const rb = new RequestBuilder("uncancel-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.cancel()
    q.uncancel()
    expect(q.canRemove()).toBe(false)
  })

  test("keepAlive is exposed as a getter", () => {
    const rb = new RequestBuilder("getter-test")
    rb.withOptions({ groupingDelay: 0, keepAlive: 42_000 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    expect(q.keepAlive).toBe(42_000)
  })

  test("keepAlive defaults to 0 when not specified", () => {
    const rb = new RequestBuilder("default-ka")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    expect(q.keepAlive).toBe(0)
  })

  test("query with keepAlive survives between SSR requests", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // First SSR request
    const rb1 = new RequestBuilder("swr-survive")
    rb1.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb1.withFilter().kinds([0]).authors([PUBKEY_A])
    const q = qm.query(rb1)
    q.start()
    await sleep(50)

    // Deliver data and EOSE
    const profile = createEv("profile-1", 0, 1000, PUBKEY_A)
    pool.emit("event", conn.address, q.traces[0].id, profile)
    conn.emit("eose", q.traces[0].id)
    expect(q.snapshot).toHaveLength(1)

    // Simulate React unmount
    q.cancel()
    expect(qm.get("swr-survive")).toBeDefined()

    // Second SSR request — same query ID, same filters
    const rb2 = new RequestBuilder("swr-survive")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([0]).authors([PUBKEY_A])
    const q2 = qm.query(rb2)

    expect(q2).toBe(q)
    expect(q2.snapshot).toHaveLength(1)
  })

  test("query without keepAlive is cleaned up after default TTL", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("short-lived")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    q.cancel()
    await sleep(2200)
    expect(qm.get("short-lived")).toBeUndefined()
  })
})

describe("Query.addRequest — filter dedup via areFiltersCovered", () => {
  let pool: MockPool
  let system: SystemInterface
  let qm: QueryManager

  beforeEach(() => {
    pool = new MockPool()
    system = makeSystem(pool)
    qm = new QueryManager(system)
  })

  afterEach(() => {
    qm.destroy()
  })

  test("same filters on reused query produces no new traces", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-same", rb => {
      rb.withFilter().kinds([1]).limit(10)
    }, { keepAlive: 30_000 })
    const reqsBefore = conn.sentRequests.length

    // Second request: identical filters
    const rb2 = new RequestBuilder("dedup-same")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]).limit(10)
    const result = q.addRequest(rb2)

    // addRequest returns undefined (no new filters added)
    expect(result).toBeUndefined()
    // No new REQ sent
    expect(conn.sentRequests.length).toBe(reqsBefore)
  })

  test("same kinds different limit produces new trace", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-limit", rb => {
      rb.withFilter().kinds([1]).limit(10)
    })

    const rb2 = new RequestBuilder("dedup-limit")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]).limit(50)
    const result = q.addRequest(rb2)
    expect(result).toBe(true)
  })

  test("same kinds different authors produces new trace", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-authors", rb => {
      rb.withFilter().kinds([1]).authors([PUBKEY_A])
    })

    const rb2 = new RequestBuilder("dedup-authors")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]).authors([PUBKEY_B])
    const result = q.addRequest(rb2)
    expect(result).toBe(true)
  })

  test("same kinds different since produces new trace", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-since", rb => {
      rb.withFilter().kinds([1]).since(1000)
    })

    const rb2 = new RequestBuilder("dedup-since")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]).since(2000)
    const result = q.addRequest(rb2)
    expect(result).toBe(true)
  })

  test("different kinds always produces new trace", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-kinds", rb => {
      rb.withFilter().kinds([1])
    })

    const rb2 = new RequestBuilder("dedup-kinds")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([0])
    const result = q.addRequest(rb2)
    expect(result).toBe(true)
  })

  test("tag filter not in existing traces produces new trace", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-tags", rb => {
      rb.withFilter().kinds([1])
    })

    const rb2 = new RequestBuilder("dedup-tags")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]).tag("e", ["event-id"])
    const result = q.addRequest(rb2)
    expect(result).toBe(true)
  })

  test("identical filter with tag produces no new trace", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-tag-same", rb => {
      rb.withFilter().kinds([1]).tag("e", ["event-id"]).authors([PUBKEY_A])
    })

    const rb2 = new RequestBuilder("dedup-tag-same")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]).tag("e", ["event-id"]).authors([PUBKEY_A])
    const result = q.addRequest(rb2)
    expect(result).toBeUndefined()
  })

  test("same builder instance is always deduplicated", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("dedup-instance")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)

    const result = q.addRequest(rb)
    expect(result).toBeUndefined()
  })

  test("multiple filters: partially covered adds only uncovered ones", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // First request: kinds=[1]
    const q = await setupEosedQuery(qm, pool, conn, "partial-coverage", rb => {
      rb.withFilter().kinds([1])
    })

    // Second request: kinds=[1] AND kinds=[0]
    const rb2 = new RequestBuilder("partial-coverage")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]) // already covered
    rb2.withFilter().kinds([0]) // new
    const result = q.addRequest(rb2)

    // Should add because there's a new filter (kinds=[0])
    expect(result).toBe(true)
  })

  test("filter with relay routing is deduplicated (relays are not matching criteria)", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "dedup-relays", rb => {
      rb.withFilter().kinds([1])
    })

    // Same filter but with relay specified — relay is routing, not matching
    const rb2 = new RequestBuilder("dedup-relays")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1]).relay("wss://other.relay/")
    const result = q.addRequest(rb2)
    expect(result).toBeUndefined()
  })
})

describe("Query.areFiltersCovered", () => {
  let pool: MockPool
  let system: SystemInterface
  let qm: QueryManager

  beforeEach(() => {
    pool = new MockPool()
    system = makeSystem(pool)
    qm = new QueryManager(system)
  })

  afterEach(() => {
    qm.destroy()
  })

  test("returns false when no filters have been emitted yet", () => {
    const rb = new RequestBuilder("no-sent")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    // Query created but not started — no filters emitted
    expect(q.areFiltersCovered([{ kinds: [1] }])).toBe(false)
  })

  test("returns true after filters have been emitted", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "covered", rb => {
      rb.withFilter().kinds([1])
    })

    expect(q.areFiltersCovered([{ kinds: [1] }])).toBe(true)
  })

  test("returns false for filters that don't match what was sent", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "not-covered", rb => {
      rb.withFilter().kinds([1])
    })

    expect(q.areFiltersCovered([{ kinds: [0] }])).toBe(false)
  })

  test("returns true only when ALL filters are covered", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "partial-all", rb => {
      rb.withFilter().kinds([1])
    })

    // Two filters: one covered, one not
    expect(q.areFiltersCovered([{ kinds: [1] }, { kinds: [0] }])).toBe(false)
  })

  test("returns true when all filters match across multiple emitted requests", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // Create query with two filters — both get emitted at once
    const q = await setupEosedQuery(qm, pool, conn, "multi-covered", rb => {
      rb.withFilter().kinds([1])
      rb.withFilter().kinds([0])
    })

    expect(q.areFiltersCovered([{ kinds: [1] }, { kinds: [0] }])).toBe(true)
  })
})

describe("QueryManager.query — SWR reuse via keepAlive", () => {
  let pool: MockPool
  let system: SystemInterface
  let qm: QueryManager

  beforeEach(() => {
    pool = new MockPool()
    system = makeSystem(pool)
    qm = new QueryManager(system)
  })

  afterEach(() => {
    qm.destroy()
  })

  test("reused query with keepAlive returns data without new relay requests", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // Request 1
    const rb1 = new RequestBuilder("swr-no-req")
    rb1.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb1.withFilter().kinds([0]).authors([PUBKEY_A])
    const q1 = qm.query(rb1)
    q1.start()
    await sleep(50)

    // Deliver data and EOSE
    const profile = createEv("p1", 0, 1000, PUBKEY_A)
    pool.emit("event", conn.address, q1.traces[0].id, profile)
    conn.emit("eose", q1.traces[0].id)
    const reqsAfterFirst = conn.sentRequests.length

    // Cancel (simulates unmount)
    q1.cancel()

    // Request 2 — same query ID, same filters
    const rb2 = new RequestBuilder("swr-no-req")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([0]).authors([PUBKEY_A])
    const q2 = qm.query(rb2)

    expect(q2).toBe(q1)
    expect(q2.snapshot).toHaveLength(1)
    // No new REQ sent because filters are already covered
    expect(conn.sentRequests.length).toBe(reqsAfterFirst)
  })

  test("reused query with different filters sends new relay requests", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const q = await setupEosedQuery(qm, pool, conn, "swr-diff", rb => {
      rb.withFilter().kinds([0])
    }, { keepAlive: 30_000 })
    const reqsAfterFirst = conn.sentRequests.length

    // Request 2: kinds=[1] (different)
    const rb2 = new RequestBuilder("swr-diff")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1])
    const q2 = qm.query(rb2)

    expect(q2).toBe(q)
    q2.start()
    await sleep(50)
    expect(conn.sentRequests.length).toBeGreaterThan(reqsAfterFirst)
  })

  test("query without keepAlive is cleaned up and must be recreated", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb1 = new RequestBuilder("no-keepalive")
    rb1.withOptions({ groupingDelay: 0 })
    rb1.withFilter().kinds([1])
    const q1 = qm.query(rb1)
    q1.start()
    await sleep(50)

    q1.cancel()
    await sleep(2200)

    expect(qm.get("no-keepalive")).toBeUndefined()

    // New request creates a fresh query
    const rb2 = new RequestBuilder("no-keepalive")
    rb2.withOptions({ groupingDelay: 0 })
    rb2.withFilter().kinds([1])
    const q2 = qm.query(rb2)
    expect(q2).not.toBe(q1)
  })

  test("keepAlive takes the maximum across multiple addRequest calls", async () => {
    const rb1 = new RequestBuilder("max-keepalive")
    rb1.withOptions({ groupingDelay: 0, keepAlive: 10_000 })
    rb1.withFilter().kinds([1])
    const q = qm.query(rb1)
    expect(q.keepAlive).toBe(10_000)

    // Longer keepAlive via addRequest
    const rb2 = new RequestBuilder("max-keepalive")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 60_000 })
    rb2.withFilter().kinds([0]).authors([PUBKEY_A])
    q.addRequest(rb2)
    expect(q.keepAlive).toBe(60_000)

    // Shorter keepAlive — should not reduce
    const rb3 = new RequestBuilder("max-keepalive")
    rb3.withOptions({ groupingDelay: 0, keepAlive: 5_000 })
    rb3.withFilter().kinds([2])
    q.addRequest(rb3)
    expect(q.keepAlive).toBe(60_000)
  })

  test("uncancel is called when reusing an existing query", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb1 = new RequestBuilder("uncancel-reuse")
    rb1.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb1.withFilter().kinds([1])
    const q1 = qm.query(rb1)
    q1.start()
    await sleep(50)

    // Cancel it
    q1.cancel()
    expect(q1.canRemove()).toBe(false) // within grace period

    // Reuse it — QueryManager should uncancel
    const rb2 = new RequestBuilder("uncancel-reuse")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([1])
    const q2 = qm.query(rb2)
    expect(q2).toBe(q1)
    expect(q2.canRemove()).toBe(false)
  })
})

describe("Full SSR lifecycle (useRequestBuilder simulation)", () => {
  let pool: MockPool
  let system: SystemInterface
  let qm: QueryManager

  beforeEach(() => {
    pool = new MockPool()
    system = makeSystem(pool)
    qm = new QueryManager(system)
  })

  afterEach(() => {
    qm.destroy()
  })

  /**
   * Simulates what useRequestBuilder does:
   * 1. useMemo: system.Query(rb)
   * 2. subscribe: q.uncancel() + q.start()
   * 3. getSnapshot: q.snapshot
   * 4. cleanup: q.flush() + q.cancel()
   */
  test("mount → data → unmount → remount: no duplicate REQ, data preserved", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // ---- MOUNT 1 ----
    const rb1 = new RequestBuilder("ssr-lifecycle")
    rb1.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb1.withFilter().kinds([0]).authors([PUBKEY_A])

    // useMemo: creates query
    const q1 = qm.query(rb1)

    // subscribe: uncancel + start
    q1.uncancel()
    q1.start()
    await sleep(50)

    // Relay delivers a profile event + EOSE
    const profile = createEv("profile-ssr", 0, 1000, PUBKEY_A)
    pool.emit("event", conn.address, q1.traces[0].id, profile)
    conn.emit("eose", q1.traces[0].id)

    // getSnapshot: data is available
    expect(q1.snapshot).toHaveLength(1)
    expect(q1.snapshot[0].id).toBe("profile-ssr")
    const reqsAfterMount1 = conn.sentRequests.length

    // ---- UNMOUNT 1 ----
    q1.flush()
    q1.cancel()

    // Query still exists (keepAlive window)
    expect(qm.get("ssr-lifecycle")).toBeDefined()

    // ---- MOUNT 2 (same filters) ----
    const rb2 = new RequestBuilder("ssr-lifecycle")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([0]).authors([PUBKEY_A])

    // useMemo: reuses existing query
    const q2 = qm.query(rb2)
    expect(q2).toBe(q1)

    // subscribe: uncancel + start
    q2.uncancel()
    q2.start()

    // getSnapshot: data is still there from first mount
    expect(q2.snapshot).toHaveLength(1)
    expect(q2.snapshot[0].id).toBe("profile-ssr")

    // No new REQ was sent — filters already covered
    expect(conn.sentRequests.length).toBe(reqsAfterMount1)

    // ---- UNMOUNT 2 ----
    q2.flush()
    q2.cancel()
  })

  test("mount → data → unmount → remount with expanded filters: new REQ for new filters only", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // ---- MOUNT 1: kinds=[0] ----
    const rb1 = new RequestBuilder("ssr-expand")
    rb1.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb1.withFilter().kinds([0]).authors([PUBKEY_A])

    const q1 = qm.query(rb1)
    q1.uncancel()
    q1.start()
    await sleep(50)

    const profile = createEv("profile-expand", 0, 1000, PUBKEY_A)
    pool.emit("event", conn.address, q1.traces[0].id, profile)
    conn.emit("eose", q1.traces[0].id)
    const reqsAfterMount1 = conn.sentRequests.length

    // ---- UNMOUNT 1 ----
    q1.flush()
    q1.cancel()

    // ---- MOUNT 2: kinds=[0] + kinds=[1] (expanded) ----
    const rb2 = new RequestBuilder("ssr-expand")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 30_000 })
    rb2.withFilter().kinds([0]).authors([PUBKEY_A]) // already covered
    rb2.withFilter().kinds([1]).authors([PUBKEY_A]) // new

    const q2 = qm.query(rb2)
    expect(q2).toBe(q1)

    q2.uncancel()
    q2.start()
    await sleep(50)

    // A new REQ was sent for the kinds=[1] filter
    expect(conn.sentRequests.length).toBeGreaterThan(reqsAfterMount1)

    // Old data is still there
    expect(q2.snapshot).toHaveLength(1)
    expect(q2.snapshot[0].id).toBe("profile-expand")
  })

  test("mount → unmount → cleanup expires → remount: fresh query created", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // ---- MOUNT 1 (no keepAlive) ----
    const rb1 = new RequestBuilder("ssr-expire")
    rb1.withOptions({ groupingDelay: 0 }) // no keepAlive
    rb1.withFilter().kinds([1])

    const q1 = qm.query(rb1)
    q1.uncancel()
    q1.start()
    await sleep(50)

    // ---- UNMOUNT 1 ----
    q1.flush()
    q1.cancel()

    // Wait for cleanup (default 1s TTL)
    await sleep(2200)

    // Query is gone
    expect(qm.get("ssr-expire")).toBeUndefined()

    // ---- MOUNT 2: fresh query ----
    const rb2 = new RequestBuilder("ssr-expire")
    rb2.withOptions({ groupingDelay: 0 })
    rb2.withFilter().kinds([1])

    const q2 = qm.query(rb2)
    expect(q2).not.toBe(q1) // completely new query
    expect(q2.snapshot).toHaveLength(0) // no cached data
  })

  test("multiple rapid mount/unmount cycles: query persists, single REQ", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const makeRb = () => {
      const rb = new RequestBuilder("ssr-rapid")
      rb.withOptions({ groupingDelay: 0, keepAlive: 5_000 })
      rb.withFilter().kinds([0]).authors([PUBKEY_A])
      return rb
    }

    // Mount 1
    const q1 = qm.query(makeRb())
    q1.uncancel()
    q1.start()
    await sleep(50)

    // Deliver data + EOSE
    const profile = createEv("profile-rapid", 0, 1000, PUBKEY_A)
    pool.emit("event", conn.address, q1.traces[0].id, profile)
    conn.emit("eose", q1.traces[0].id)
    const reqsAfterFirst = conn.sentRequests.length

    // Rapid cycle: unmount → remount × 3
    for (let i = 0; i < 3; i++) {
      q1.flush()
      q1.cancel()

      const qAgain = qm.query(makeRb())
      expect(qAgain).toBe(q1)
      qAgain.uncancel()
      qAgain.start()
    }

    // Still only the original REQ — no duplicates from rapid cycling
    expect(conn.sentRequests.length).toBe(reqsAfterFirst)

    // Data is still intact
    expect(q1.snapshot).toHaveLength(1)
  })

  test("cancel within keepAlive window, then remount: query not removable", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("ssr-window")
    rb.withOptions({ groupingDelay: 0, keepAlive: 5_000 })
    rb.withFilter().kinds([1])

    const q = qm.query(rb)
    q.start()
    await sleep(50)

    // Cancel
    q.cancel()
    expect(q.canRemove()).toBe(false) // within keepAlive window

    // Remount before keepAlive expires
    const rb2 = new RequestBuilder("ssr-window")
    rb2.withOptions({ groupingDelay: 0, keepAlive: 5_000 })
    rb2.withFilter().kinds([1])

    const q2 = qm.query(rb2)
    expect(q2).toBe(q)
    expect(q2.canRemove()).toBe(false) // uncancel was called
  })
})
