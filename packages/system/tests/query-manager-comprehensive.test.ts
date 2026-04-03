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
import { QueryTrace, QueryTraceState } from "../src/query"
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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function makeRb(id: string, groupingDelay = 0) {
  const rb = new RequestBuilder(id)
  rb.withOptions({ groupingDelay })
  rb.withFilter().kinds([1]).limit(10)
  return rb
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

function makeSystem(pool: MockPool, opts?: { cacheRelay?: any }): SystemInterface {
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
    cacheRelay: opts?.cacheRelay,
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

describe("QueryManager — event propagation", () => {
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

  test("events from pool flow through trace into query feed", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("event-flow")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.traces).toHaveLength(1)
    const traceId = q.traces[0].id

    const event = createEv("evt1", 1, 500)
    pool.emit("event", "wss://relay.test", traceId, event)

    expect(q.snapshot).toHaveLength(1)
    expect(q.snapshot[0].id).toBe("evt1")
  })

  test("events with wrong sub id are ignored", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("wrong-sub")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const event = createEv("evt1", 1, 500)
    pool.emit("event", "wss://relay.test", "wrong-trace-id", event)

    expect(q.snapshot).toHaveLength(0)
  })

  test("events that dont match trace filters are rejected", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("filter-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const traceId = q.traces[0].id
    const badEvent = createEv("bad", 999, 500)
    pool.emit("event", "wss://relay.test", traceId, badEvent)

    expect(q.snapshot).toHaveLength(0)
  })

  test("handleEvent broadcasts to all active queries", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb1 = makeRb("q1")
    const rb2 = makeRb("q2")
    const q1 = qm.query(rb1)
    const q2 = qm.query(rb2)
    q1.start()
    q2.start()
    await sleep(50)

    const event = createEv("broadcast", 1, 500)
    qm.handleEvent("*", event)

    expect(q1.snapshot).toHaveLength(1)
    expect(q2.snapshot).toHaveLength(1)
  })

  test("handleEvent only adds events matching query filters", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb1 = new RequestBuilder("kinds-1")
    rb1.withOptions({ groupingDelay: 0 })
    rb1.withFilter().kinds([1])
    const q1 = qm.query(rb1)
    q1.start()
    await sleep(50)

    const rb2 = new RequestBuilder("kinds-2")
    rb2.withOptions({ groupingDelay: 0 })
    rb2.withFilter().kinds([2])
    const q2 = qm.query(rb2)
    q2.start()
    await sleep(50)

    const evKind1 = createEv("k1", 1, 500)
    qm.handleEvent("*", evKind1)

    expect(q1.snapshot).toHaveLength(1)
    expect(q2.snapshot).toHaveLength(0)
  })

  test("eose from connection triggers trace eose and closes non-streaming request", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("eose-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const trace = q.traces[0]
    expect(trace.currentState).toBe(QueryTraceState.WAITING)

    conn.emit("eose", trace.id)
    expect(trace.currentState).toBe(QueryTraceState.LOCAL_CLOSE)
    expect(conn.closedRequests).toContain(trace.id)
  })

  test("eose from connection on streaming query does not close", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("stream-eose")
    rb.withOptions({ groupingDelay: 0, leaveOpen: true })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const trace = q.traces[0]
    expect(trace.currentState).toBe(QueryTraceState.WAITING_STREAM)

    conn.emit("eose", trace.id)
    expect(trace.currentState).toBe(QueryTraceState.EOSE)
    expect(conn.closedRequests).not.toContain(trace.id)
  })

  test("closed from connection triggers trace remoteClosed", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("closed-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const trace = q.traces[0]
    conn.emit("closed", trace.id, "subscription limit reached")
    expect(trace.currentState).toBe(QueryTraceState.REMOTE_CLOSE)
  })

  test("query end event cleans up pool and connection listeners", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("cleanup-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const traceId = q.traces[0].id
    const poolListenersBefore = pool.listenerCount("event")
    const connEoseListenersBefore = conn.listenerCount("eose")

    q.closeQuery()

    expect(pool.listenerCount("event")).toBeLessThan(poolListenersBefore)
    expect(conn.listenerCount("eose")).toBeLessThan(connEoseListenersBefore)
  })
})

describe("QueryManager — query dedup and lifecycle", () => {
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

  test("second query with same id reuses existing Query and merges filters", () => {
    const rb1 = new RequestBuilder("shared")
    rb1.withFilter().kinds([1])
    const rb2 = new RequestBuilder("shared")
    rb2.withFilter().kinds([2])

    const q1 = qm.query(rb1)
    const q2 = qm.query(rb2)
    expect(q1).toBe(q2)
  })

  test("get() returns query by id", () => {
    const rb = makeRb("findme")
    qm.query(rb)
    expect(qm.get("findme")).toBeDefined()
    expect(qm.get("nope")).toBeUndefined()
  })

  test("iterator yields all active queries", () => {
    qm.query(makeRb("q1"))
    qm.query(makeRb("q2"))
    const ids = [...qm].map(([id]) => id)
    expect(ids).toContain("q1")
    expect(ids).toContain("q2")
  })

  test("destroy clears all queries and stops cleanup interval", () => {
    qm.query(makeRb("q1"))
    qm.query(makeRb("q2"))
    qm.destroy()
    expect(qm.get("q1")).toBeUndefined()
    expect(qm.get("q2")).toBeUndefined()
  })

  test("cleanup removes queries past cancel grace window", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("cleanup-q")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    q.cancel()
    expect(qm.get("cleanup-q")).toBeDefined()

    await sleep(2200)
    expect(qm.get("cleanup-q")).toBeUndefined()
  })

  test("cleanup times out stale traces", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("timeout-q")
    rb.withOptions({ groupingDelay: 0, timeout: 500 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const trace = q.traces[0]
    expect(trace.currentState).toBe(QueryTraceState.WAITING)

    await sleep(1500)
    expect(trace.currentState).toBe(QueryTraceState.TIMEOUT)
  })
})

describe("QueryManager — connection race conditions", () => {
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

  test("query to not-yet-open relay queues trace, sends after open", async () => {
    const conn = new MockConnection("wss://relay.test", false)
    pool.add(conn)

    const rb = makeRb("pending-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.traces).toHaveLength(1)
    expect(q.traces[0].currentState).toBe(QueryTraceState.QUEUED)
    expect(conn.sentRequests).toHaveLength(0)

    conn.open()
    pool.emit("connected", conn.address, false)
    await sleep(10)

    expect(conn.sentRequests.length).toBeGreaterThanOrEqual(1)
    expect(q.traces[0].currentState).toBe(QueryTraceState.WAITING)
  })

  test("multiple pending relays all receive REQ after opening", async () => {
    const c1 = new MockConnection("wss://r1.test", false)
    const c2 = new MockConnection("wss://r2.test", false)
    pool.add(c1)
    pool.add(c2)

    const rb = makeRb("multi-pending")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.traces).toHaveLength(2)
    expect(c1.sentRequests).toHaveLength(0)
    expect(c2.sentRequests).toHaveLength(0)

    c1.open()
    pool.emit("connected", c1.address, false)
    await sleep(10)

    c2.open()
    pool.emit("connected", c2.address, false)
    await sleep(10)

    expect(c1.sentRequests.length).toBeGreaterThanOrEqual(1)
    expect(c2.sentRequests.length).toBeGreaterThanOrEqual(1)
  })

  test("disconnect drops pending traces for that connection", async () => {
    const conn = new MockConnection("wss://relay.test", false)
    pool.add(conn)

    const rb = makeRb("disconnect-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const trace = q.traces[0]
    expect(trace.currentState).toBe(QueryTraceState.QUEUED)

    pool.emit("disconnect", conn.address, 1006)
    expect(trace.currentState).toBe(QueryTraceState.DROP)
  })

  test("events arriving before eose are collected correctly", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("stream-collect")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const traceId = q.traces[0].id

    pool.emit("event", conn.address, traceId, createEv("e1", 1, 100))
    pool.emit("event", conn.address, traceId, createEv("e2", 1, 200))
    pool.emit("event", conn.address, traceId, createEv("e3", 1, 300))

    conn.emit("eose", traceId)

    expect(q.snapshot).toHaveLength(3)
    expect(q.progress).toBe(1)
  })

  test("events arriving after eose on streaming query are still collected", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("post-eose-stream")
    rb.withOptions({ groupingDelay: 0, leaveOpen: true })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const traceId = q.traces[0].id

    pool.emit("event", conn.address, traceId, createEv("before", 1, 100))
    conn.emit("eose", traceId)
    pool.emit("event", conn.address, traceId, createEv("after", 1, 200))

    expect(q.snapshot).toHaveLength(2)
  })
})

describe("QueryManager — cache relay integration", () => {
  let pool: MockPool
  let qm: QueryManager

  afterEach(() => {
    qm.destroy()
  })

  test("cache results are added to feed before relay results", async () => {
    pool = new MockPool()
    const cachedEvent = createEv("cached", 1, 100)
    const cacheRelay = {
      query: async () => [cachedEvent],
      event: async () => {},
      close: () => {},
    }
    const system = makeSystem(pool, { cacheRelay })
    qm = new QueryManager(system)

    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("cache-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.snapshot).toContainEqual(cachedEvent)
  })

  test("skipCache=true bypasses cache relay", async () => {
    pool = new MockPool()
    let cacheQueried = false
    const cacheRelay = {
      query: async () => {
        cacheQueried = true
        return []
      },
      event: async () => {},
      close: () => {},
    }
    const system = makeSystem(pool, { cacheRelay })
    qm = new QueryManager(system)

    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("skip-cache")
    rb.withOptions({ groupingDelay: 0, skipCache: true })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(cacheQueried).toBe(false)
  })

  test("satisfied id filters are removed after cache hit", async () => {
    pool = new MockPool()
    const cachedEvent = createEv("target-id", 1, 100)
    const cacheRelay = {
      query: async () => [cachedEvent],
      event: async () => {},
      close: () => {},
    }
    const system = makeSystem(pool, { cacheRelay })
    qm = new QueryManager(system)

    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("satisfied-filter")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().ids(["target-id"])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.snapshot).toHaveLength(1)
    expect(conn.sentRequests).toHaveLength(0)
  })
})

describe("QueryManager — multi-relay event aggregation", () => {
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

  test("same event from multiple relays is deduplicated in feed", async () => {
    const c1 = new MockConnection("wss://r1.test", true)
    const c2 = new MockConnection("wss://r2.test", true)
    pool.add(c1)
    pool.add(c2)

    const rb = makeRb("dedup-relay")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.traces).toHaveLength(2)
    const t1 = q.traces.find(t => t.relay === "wss://r1.test")!
    const t2 = q.traces.find(t => t.relay === "wss://r2.test")!

    const sameEvent = createEv("same", 1, 500)
    pool.emit("event", "wss://r1.test", t1.id, { ...sameEvent })
    pool.emit("event", "wss://r2.test", t2.id, { ...sameEvent })

    expect(q.snapshot).toHaveLength(1)
  })

  test("different events from multiple relays are all collected", async () => {
    const c1 = new MockConnection("wss://r1.test", true)
    const c2 = new MockConnection("wss://r2.test", true)
    pool.add(c1)
    pool.add(c2)

    const rb = makeRb("multi-events")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const t1 = q.traces.find(t => t.relay === "wss://r1.test")!
    const t2 = q.traces.find(t => t.relay === "wss://r2.test")!

    pool.emit("event", "wss://r1.test", t1.id, createEv("from-r1", 1, 100))
    pool.emit("event", "wss://r2.test", t2.id, createEv("from-r2", 1, 200))

    expect(q.snapshot).toHaveLength(2)
  })

  test("eose from all relays results in query progress=1", async () => {
    const c1 = new MockConnection("wss://r1.test", true)
    const c2 = new MockConnection("wss://r2.test", true)
    pool.add(c1)
    pool.add(c2)

    const rb = makeRb("eose-all")
    const q = qm.query(rb)
    let eoseFired = false
    q.on("eose", () => {
      eoseFired = true
    })
    q.start()
    await sleep(50)

    expect(q.traces).toHaveLength(2)
    for (const trace of q.traces) {
      c1.emit("eose", trace.id)
      c2.emit("eose", trace.id)
    }

    expect(q.progress).toBe(1)
    expect(eoseFired).toBe(true)
  })
})

describe("QueryManager — canSendQuery validation", () => {
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

  test("down connection is skipped", async () => {
    const conn = new MockConnection("wss://down.test", true)
    conn.markDown()
    pool.add(conn)

    const rb = makeRb("down-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.traces).toHaveLength(0)
    expect(conn.sentRequests).toHaveLength(0)
  })

  test("ephemeral connection is skipped for broadcast", async () => {
    const conn = new MockConnection("wss://ephemeral.test", true)
    conn.ephemeral = true
    pool.add(conn)

    const rb = makeRb("ephemeral-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.traces).toHaveLength(0)
  })

  test("search query skipped on relay without NIP-50", async () => {
    const conn = new MockConnection("wss://no-search.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("search-no-nip50")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).search("test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(conn.sentRequests).toHaveLength(0)
  })

  test("search query sent to relay with NIP-50", async () => {
    const conn = new MockConnection("wss://search.test", true)
    conn.info = { supported_nips: [50] } as any
    pool.add(conn)

    const rb = new RequestBuilder("search-nip50")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).search("test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(conn.sentRequests).toHaveLength(1)
  })

  test("cancelled query past grace window is cleaned up and not reusable", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = makeRb("cancel-test")
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    q.cancel()
    expect(q.canRemove()).toBe(false)

    await sleep(2200)
    expect(q.canRemove()).toBe(true)
    expect(qm.get("cancel-test")).toBeUndefined()
  })
})

describe("QueryTrace state machine", () => {
  test("NEW -> QUEUED -> WAITING -> EOSE", () => {
    const t = new QueryTrace("wss://r.test", [], "c1", false)
    expect(t.currentState).toBe(QueryTraceState.NEW)
    expect(t.finished).toBe(false)

    t.queued()
    expect(t.currentState).toBe(QueryTraceState.QUEUED)
    expect(t.finished).toBe(false)

    t.sent()
    expect(t.currentState).toBe(QueryTraceState.WAITING)
    expect(t.finished).toBe(false)

    t.eose()
    expect(t.currentState).toBe(QueryTraceState.EOSE)
    expect(t.finished).toBe(true)
  })

  test("leaveOpen trace transitions to WAITING_STREAM on sent()", () => {
    const t = new QueryTrace("wss://r.test", [], "c1", true)
    t.queued()
    t.sent()
    expect(t.currentState).toBe(QueryTraceState.WAITING_STREAM)
    expect(t.finished).toBe(false)
  })

  test("all terminal states are considered finished", () => {
    const terminals = ["eose", "timeout", "drop", "remoteClosed", "close"] as const
    for (const method of terminals) {
      const t = new QueryTrace("wss://r.test", [], "c1", false)
      t.queued()
      ;(t[method] as () => void)()
      expect(t.finished).toBe(true)
    }
  })

  test("same-state transition does not emit stateChange", () => {
    const t = new QueryTrace("wss://r.test", [], "c1", false)
    const changes: string[] = []
    t.on("stateChange", e => changes.push(e.state))

    t.queued()
    t.queued()
    expect(changes).toHaveLength(1)
  })

  test("stateChange event includes correct metadata", () => {
    const t = new QueryTrace("wss://relay.test", [{ kinds: [1] }], "conn-id", false)
    let event: any
    t.on("stateChange", e => {
      event = e
    })

    t.queued()
    expect(event.relay).toBe("wss://relay.test")
    expect(event.connId).toBe("conn-id")
    expect(event.state).toBe(QueryTraceState.QUEUED)
    expect(event.filters).toEqual([{ kinds: [1] }])
    expect(event.id).toBe(t.id)
    expect(typeof event.timestamp).toBe("number")
  })

  test("SYNC_WAITING and SYNC_FALLBACK states", () => {
    const t = new QueryTrace("wss://r.test", [], "c1", false)
    t.queued()
    t.sentSync()
    expect(t.currentState).toBe(QueryTraceState.SYNC_WAITING)
    expect(t.finished).toBe(false)

    t.syncFallback()
    expect(t.currentState).toBe(QueryTraceState.SYNC_FALLBACK)
    expect(t.finished).toBe(false)
  })
})
