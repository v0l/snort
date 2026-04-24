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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// --- Mocks (same pattern as query-manager-comprehensive.test.ts) ---

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
    FetchAll: () => Promise.resolve(),
    hydrateQuery: () => {},
    getHydrationData: () => ({}),
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

// --- Helpers that mirror NostrSystem's hydration methods ---

/**
 * Get hydration data from all queries in a QueryManager.
 * Mirrors NostrSystem.getHydrationData().
 */
function getHydrationData(qm: QueryManager): Record<string, Array<TaggedNostrEvent>> {
  const data: Record<string, Array<TaggedNostrEvent>> = {}
  for (const [, q] of qm) {
    const snapshot = q.snapshot
    if (snapshot.length > 0) {
      data[q.id] = snapshot
    }
  }
  return data
}

/**
 * Hydrate a query with pre-fetched events.
 * Mirrors NostrSystem.hydrateQuery().
 */
function hydrateQuery(qm: QueryManager, id: string, events: Array<TaggedNostrEvent>) {
  const q = qm.get(id)
  if (q) {
    q.feed.add(events)
  }
}

// --- Tests ---

describe("SSR Hydration — getHydrationData", () => {
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

  test("returns empty object when no queries exist", () => {
    expect(getHydrationData(qm)).toEqual({})
  })

  test("returns empty object when queries have no events", () => {
    const rb = new RequestBuilder("empty-query")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    qm.query(rb)

    expect(getHydrationData(qm)).toEqual({})
  })

  test("serializes query snapshots with events", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("hydrate-me")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    const ev = createEv("ev1", 1, 500)
    qm.handleEvent("*", ev)

    const data = getHydrationData(qm)
    expect(Object.keys(data)).toContain("hydrate-me")
    expect(data["hydrate-me"]).toHaveLength(1)
    expect(data["hydrate-me"][0].id).toBe("ev1")
  })

  test("serializes multiple queries independently", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb1 = new RequestBuilder("q1")
    rb1.withOptions({ groupingDelay: 0 })
    rb1.withFilter().kinds([1])
    qm.query(rb1).start()

    const rb2 = new RequestBuilder("q2")
    rb2.withOptions({ groupingDelay: 0 })
    rb2.withFilter().kinds([0])
    qm.query(rb2).start()

    await sleep(50)

    qm.handleEvent("*", createEv("text-note", 1, 100))
    qm.handleEvent("*", createEv("profile", 0, 200))

    const data = getHydrationData(qm)
    expect(data["q1"]).toHaveLength(1)
    expect(data["q1"][0].kind).toBe(1)
    expect(data["q2"]).toHaveLength(1)
    expect(data["q2"][0].kind).toBe(0)
  })

  test("skips queries with empty snapshots", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb1 = new RequestBuilder("with-data")
    rb1.withOptions({ groupingDelay: 0 })
    rb1.withFilter().kinds([1])
    qm.query(rb1).start()

    const rb2 = new RequestBuilder("no-data")
    rb2.withOptions({ groupingDelay: 0 })
    rb2.withFilter().kinds([7])
    qm.query(rb2).start()

    await sleep(50)

    qm.handleEvent("*", createEv("ev1", 1, 100))

    const data = getHydrationData(qm)
    expect(Object.keys(data)).toContain("with-data")
    expect(Object.keys(data)).not.toContain("no-data")
  })
})

describe("SSR Hydration — hydrateQuery", () => {
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

  test("injects events into an existing query", () => {
    const rb = new RequestBuilder("hydrate-target")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)

    const events = [createEv("h1", 1, 100), createEv("h2", 1, 200)]
    hydrateQuery(qm, "hydrate-target", events)

    expect(q.snapshot).toHaveLength(2)
    expect(q.snapshot.map(e => e.id)).toContain("h1")
    expect(q.snapshot.map(e => e.id)).toContain("h2")
  })

  test("does nothing for non-existent query", () => {
    const events = [createEv("h1", 1, 100)]
    // Should not throw
    expect(() => hydrateQuery(qm, "nonexistent", events)).not.toThrow()
  })

  test("hydrated events appear in snapshot for React rendering", () => {
    const rb = new RequestBuilder("ssr-query")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).authors(["pk1"])
    const q = qm.query(rb)

    const preHydration = q.snapshot
    expect(preHydration).toHaveLength(0)

    const events = [createEv("note1", 1, 100, "pk1"), createEv("note2", 1, 200, "pk1")]
    hydrateQuery(qm, "ssr-query", events)

    expect(q.snapshot).toHaveLength(2)
  })

  test("hydrating events merges with existing data (deduplication)", () => {
    const rb = new RequestBuilder("merge-query")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)

    // Pre-existing event
    qm.handleEvent("*", createEv("existing", 1, 100))

    // Hydrate with same event + new one
    hydrateQuery(qm, "merge-query", [createEv("existing", 1, 100), createEv("new", 1, 200)])

    // Should deduplicate the "existing" event
    expect(q.snapshot).toHaveLength(2)
  })
})

describe("SSR Hydration — full server-to-client round trip", () => {
  let serverPool: MockPool
  let serverSystem: SystemInterface
  let serverQm: QueryManager

  let clientPool: MockPool
  let clientSystem: SystemInterface
  let clientQm: QueryManager

  beforeEach(() => {
    // --- Server side ---
    serverPool = new MockPool()
    serverSystem = makeSystem(serverPool)
    serverQm = new QueryManager(serverSystem)

    // --- Client side ---
    clientPool = new MockPool()
    clientSystem = makeSystem(clientPool)
    clientQm = new QueryManager(clientSystem)
  })

  afterEach(() => {
    serverQm.destroy()
    clientQm.destroy()
  })

  test("full SSR cycle: server fetches → serializes → client hydrates", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    serverPool.add(conn)

    // === SERVER SIDE ===

    // Pass 1: Create queries (simulates renderToString triggering hooks)
    const rb = new RequestBuilder("feed-query")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).limit(10)
    const serverQuery = serverQm.query(rb)
    serverQuery.start()
    await sleep(50)

    // Simulate relay responses
    const events = [
      createEv("note-a", 1, 1000, "author1"),
      createEv("note-b", 1, 2000, "author2"),
      createEv("note-c", 1, 3000, "author3"),
    ]
    for (const ev of events) {
      serverQm.handleEvent("*", ev)
    }

    // Verify server has data
    expect(serverQuery.snapshot).toHaveLength(3)

    // Serialize hydration data (what getHydrationScript would use)
    const hydrationData = getHydrationData(serverQm)
    expect(hydrationData["feed-query"]).toHaveLength(3)

    // Simulate JSON round-trip (what happens over the wire in <script> tag)
    const serialized = JSON.stringify(hydrationData)
    const deserialized = JSON.parse(serialized) as Record<string, Array<TaggedNostrEvent>>

    // === CLIENT SIDE ===

    // Client creates the same query (useRequestBuilder hook runs)
    const clientRb = new RequestBuilder("feed-query")
    clientRb.withOptions({ groupingDelay: 0 })
    clientRb.withFilter().kinds([1]).limit(10)
    const clientQuery = clientQm.query(clientRb)

    // Before hydration, client query is empty
    expect(clientQuery.snapshot).toHaveLength(0)

    // Hydrate (what hydrateSnort does)
    for (const [id, evts] of Object.entries(deserialized)) {
      hydrateQuery(clientQm, id, evts)
    }

    // After hydration, client query has the same data as server
    expect(clientQuery.snapshot).toHaveLength(3)
    const clientIds = clientQuery.snapshot.map(e => e.id).sort()
    const serverIds = serverQuery.snapshot.map(e => e.id).sort()
    expect(clientIds).toEqual(serverIds)
  })

  test("SSR cycle with multiple queries hydrates each independently", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    serverPool.add(conn)

    // Server: create two queries
    const feedRb = new RequestBuilder("feed")
    feedRb.withOptions({ groupingDelay: 0 })
    feedRb.withFilter().kinds([1])
    serverQm.query(feedRb).start()

    const profileRb = new RequestBuilder("profiles")
    profileRb.withOptions({ groupingDelay: 0 })
    profileRb.withFilter().kinds([0])
    serverQm.query(profileRb).start()

    await sleep(50)

    // Relay delivers events
    serverQm.handleEvent("*", createEv("note1", 1, 100))
    serverQm.handleEvent("*", createEv("note2", 1, 200))
    serverQm.handleEvent("*", createEv("profile1", 0, 50, "user1"))

    // Serialize
    const hydrationData = getHydrationData(serverQm)
    expect(Object.keys(hydrationData)).toHaveLength(2)

    // JSON round-trip
    const deserialized = JSON.parse(JSON.stringify(hydrationData)) as Record<string, Array<TaggedNostrEvent>>

    // Client: create same queries
    const clientFeedRb = new RequestBuilder("feed")
    clientFeedRb.withOptions({ groupingDelay: 0 })
    clientFeedRb.withFilter().kinds([1])
    const clientFeed = clientQm.query(clientFeedRb)

    const clientProfileRb = new RequestBuilder("profiles")
    clientProfileRb.withOptions({ groupingDelay: 0 })
    clientProfileRb.withFilter().kinds([0])
    const clientProfile = clientQm.query(clientProfileRb)

    // Hydrate
    for (const [id, evts] of Object.entries(deserialized)) {
      hydrateQuery(clientQm, id, evts)
    }

    // Verify each query got its own data
    expect(clientFeed.snapshot).toHaveLength(2)
    expect(clientFeed.snapshot.every(e => e.kind === 1)).toBe(true)
    expect(clientProfile.snapshot).toHaveLength(1)
    expect(clientProfile.snapshot[0].kind).toBe(0)
  })

  test("hydration script format matches expected structure", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    serverPool.add(conn)

    const rb = new RequestBuilder("script-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    serverQm.query(rb).start()
    await sleep(50)

    serverQm.handleEvent("*", createEv("ev1", 1, 100))

    const data = getHydrationData(serverQm)
    const keys = Object.keys(data)

    // Simulate getHydrationScript
    let script = ""
    if (keys.length > 0) {
      script = `<script>window.__SNORT_HYDRATION__ = ${JSON.stringify(data)}</script>`
    }

    expect(script).toMatch(/^<script>window\.__SNORT_HYDRATION__ = /)
    expect(script).toMatch(/<\/script>$/)

    // Verify the data can be parsed back from the script content
    const jsonMatch = script.match(/window\.__SNORT_HYDRATION__ = (.+)<\/script>/)
    expect(jsonMatch).not.toBeNull()
    const parsed = JSON.parse(jsonMatch![1])
    expect(parsed["script-test"]).toHaveLength(1)
    expect(parsed["script-test"][0].id).toBe("ev1")
  })

  test("empty hydration script when no queries have data", () => {
    const data = getHydrationData(serverQm)
    const keys = Object.keys(data)
    let script = ""
    if (keys.length > 0) {
      script = `<script>window.__SNORT_HYDRATION__ = ${JSON.stringify(data)}</script>`
    }
    expect(script).toBe("")
  })
})

describe("SSR Hydration — FetchAll", () => {
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

  test("fetchAll resolves immediately when no queries exist", async () => {
    await expect(qm.fetchAll()).resolves.toBeUndefined()
  })

  test("fetchAll resolves when all queries reach EOSE", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("fetch-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    // Send EOSE for all traces
    for (const trace of q.traces) {
      conn.emit("eose", trace.id)
    }

    await expect(qm.fetchAll()).resolves.toBeUndefined()
  })

  test("fetchAll resolves after grace period once first EOSE arrives", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("grace-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    // EOSE only one trace (simulating fast relay responding)
    const firstTrace = q.traces[0]
    conn.emit("eose", firstTrace.id)

    // fetchAll should resolve after grace period, not wait for all traces
    const start = Date.now()
    await qm.fetchAll()
    const elapsed = Date.now() - start

    // Should resolve within grace period + small margin
    expect(elapsed).toBeLessThan(2000)
  })

  test("fetchAll times out remaining traces after grace period", async () => {
    const conn1 = new MockConnection("wss://fast.test", true)
    const conn2 = new MockConnection("wss://slow.test", true)
    pool.add(conn1)
    pool.add(conn2)

    const rb = new RequestBuilder("race-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    expect(q.traces.length).toBe(2)

    // Only send EOSE for the fast relay's trace
    const fastTrace = q.traces.find(t => t.relay.includes("fast.test"))!
    conn1.emit("eose", fastTrace.id)

    await qm.fetchAll()

    // The slow trace should have been timed out by fetchAll
    const slowTrace = q.traces.find(t => t.relay.includes("slow.test"))!
    expect(slowTrace.finished).toBe(true)
  })

  test("fetchAll resolves immediately if traces already finished before call", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    const rb = new RequestBuilder("already-done")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1])
    const q = qm.query(rb)
    q.start()
    await sleep(50)

    // All traces already EOSE'd
    for (const trace of q.traces) {
      conn.emit("eose", trace.id)
    }
    await sleep(10)

    const start = Date.now()
    await qm.fetchAll()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(100)
  })

  test("fetchAll skips leaveOpen queries", async () => {
    const conn = new MockConnection("wss://relay.test", true)
    pool.add(conn)

    // Create a leaveOpen query (streaming) - should be skipped by fetchAll
    const streamRb = new RequestBuilder("stream")
    streamRb.withOptions({ groupingDelay: 0, leaveOpen: true })
    streamRb.withFilter().kinds([1])
    const streamQ = qm.query(streamRb)
    streamQ.start()

    await sleep(50)

    // fetchAll should resolve immediately since the only query is leaveOpen
    await expect(qm.fetchAll()).resolves.toBeUndefined()
  })
})

describe("SSR Hydration — replaceable event handling", () => {
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

  test("hydration data for replaceable events keeps latest version", () => {
    const rb = new RequestBuilder("replaceable")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([0]) // kind 0 is replaceable
    const q = qm.query(rb)

    // Add older version then newer version
    hydrateQuery(qm, "replaceable", [
      createEv("old", 0, 100, "pk1"),
      createEv("new", 0, 200, "pk1"),
    ])

    // NoteCollection deduplicates by kind:pubkey for replaceable events
    // Should only keep the newer one
    expect(q.snapshot).toHaveLength(1)
    expect(q.snapshot[0].id).toBe("new")
  })

  test("hydration of parameterized replaceable events (kind 30000+)", () => {
    const rb = new RequestBuilder("param-replaceable")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([30023]) // kind 30023 is parameterized replaceable
    const q = qm.query(rb)

    hydrateQuery(qm, "param-replaceable", [
      createEv("old-article", 30023, 100, "pk1", [["d", "my-article"]]),
      createEv("new-article", 30023, 200, "pk1", [["d", "my-article"]]),
    ])

    // Should deduplicate by kind:pubkey:d-tag
    expect(q.snapshot).toHaveLength(1)
    expect(q.snapshot[0].id).toBe("new-article")
  })
})
