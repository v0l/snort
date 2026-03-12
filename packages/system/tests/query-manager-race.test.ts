/**
 * Tests for race conditions in QueryManager when relays are not yet connected
 * on page load.
 *
 * The bug: when useRequestBuilder fires on mount, relays may still be in
 * CONNECTING state (isOpen=false, isDown=false). The broadcast path in
 * #sendToRelays iterates the pool and calls sendTrace for each connection.
 * sendTrace only queues into #pendingTraces when maxSubscriptions is hit —
 * not when the socket is still opening. The REQ goes into Connection.PendingRaw
 * at the wire level, but if the query is cancelled/replaced before the socket
 * opens, the request is silently lost.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { CachedTable } from "@snort/shared"
import { EventEmitter } from "eventemitter3"
import { SocialGraph } from "nostr-social-graph"
import type { RelayInfoDocument, SystemInterface } from "../src"
import type { CachedMetadata, UsersFollows } from "../src/cache"
import type { CacheRelay } from "../src/cache-relay"
import type { RelaySettings } from "../src/connection"
import type { ConnectionPool, ConnectionPoolEvents, ConnectionType, ConnectionTypeEvents } from "../src/connection-pool"
import type { NostrEvent, OkResponse, ReqCommand, ReqFilter, TaggedNostrEvent } from "../src/nostr"
import type { RelayMetadataLoader } from "../src/outbox"
import type { ProfileLoaderService } from "../src/profile-cache"
import { QueryTraceState } from "../src/query"
import { QueryManager } from "../src/query-manager"
import { DefaultOptimizer } from "../src/query-optimizer"
import { RequestBuilder } from "../src/request-builder"
import type { RequestRouter } from "../src/request-router"
import type { SystemConfig, SystemSnapshot } from "../src/system"
import type { TraceTimeline } from "../src/trace-timeline"

// ---------------------------------------------------------------------------
// Minimal mock connection — starts in CONNECTING state, open on demand
// ---------------------------------------------------------------------------

class MockConnection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
  readonly id: string
  readonly address: string
  info: RelayInfoDocument | undefined = undefined
  settings: RelaySettings = { read: true, write: true }
  ephemeral = false

  #open = false
  #down = false

  /** REQ messages actually sent on the wire */
  sentRequests: Array<ReqCommand> = []

  /** REQ messages queued because socket was not open */
  pendingRequests: Array<ReqCommand> = []

  constructor(address: string) {
    super()
    this.id = crypto.randomUUID()
    this.address = address
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

  async connect() {}
  close() {}
  async publish(_ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", message: "", relay: this.address, event: _ev }
  }

  request(req: ReqCommand, cbSent?: () => void) {
    if (!this.#open) {
      // Simulate Connection.PendingRaw behaviour
      this.pendingRequests.push(req)
      return
    }
    this.sentRequests.push(req)
    cbSent?.()
  }

  closeRequest(_id: string) {}
  sendRaw(_obj: object) {}

  /** Simulate the WebSocket opening */
  open() {
    this.#open = true
    // Drain pending queue (mirrors Connection.#sendPendingRaw / #onOpen)
    for (const req of this.pendingRequests) {
      this.sentRequests.push(req)
    }
    this.pendingRequests = []
    this.emit("connected", false)
    this.emit("change")
  }
}

// ---------------------------------------------------------------------------
// Minimal mock pool
// ---------------------------------------------------------------------------

class MockPool extends EventEmitter<ConnectionPoolEvents> implements ConnectionPool {
  #connections = new Map<string, MockConnection>()

  add(conn: MockConnection) {
    this.#connections.set(conn.address, conn)
  }

  getConnection(id: string): ConnectionType | undefined {
    return this.#connections.get(id)
  }

  async connect(address: string, _options: RelaySettings, _ephemeral: boolean) {
    return this.#connections.get(address)
  }

  disconnect(_address: string) {}

  async broadcast(_ev: NostrEvent): Promise<OkResponse[]> {
    return []
  }

  async broadcastTo(_address: string, _ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", message: "", relay: _address, event: _ev }
  }

  *[Symbol.iterator]() {
    for (const kv of this.#connections) {
      yield kv
    }
  }

  /** Simulate pool.on('connected') being fired when a connection opens */
  connectionOpened(conn: MockConnection) {
    this.emit("connected", conn.address, false)
  }
}

// ---------------------------------------------------------------------------
// Minimal mock system
// ---------------------------------------------------------------------------

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
      return { ok: true, id: "", message: "", relay: "" }
    },
    takeSnapshot(): SystemSnapshot {
      return { queries: [] }
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeRb(id: string) {
  const rb = new RequestBuilder(id)
  rb.withOptions({ groupingDelay: 0, disableSyncModule: true } as any)
  rb.withFilter().kinds([1]).limit(10)
  return rb
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("QueryManager — relay connection race conditions", () => {
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
   * RACE CONDITION 1
   *
   * A relay is in the pool but still connecting (isOpen=false).
   * When a query is issued the REQ should eventually reach the relay.
   * With the bug, the trace stays in QUEUED state because the connection
   * is not open — the wire-level PendingRaw queue flushes, but the trace
   * `cbSent` is never called, so the trace never transitions to WAITING.
   * Once the connection opens, `#retryPendingTraces` is not called for
   * this trace because it was never put into `#pendingTraces`.
   */
  test("REQ is sent to relay that was still connecting when query was created", async () => {
    const conn = new MockConnection("wss://relay.test")
    pool.add(conn)
    // conn is NOT open yet — simulates page load before WebSocket handshake

    const rb = makeRb("test-connecting")
    const q = qm.query(rb)
    q.start()

    // Give the grouping timer a tick to fire
    await sleep(50)

    // At this point the relay is still connecting. The REQ should be queued.
    // Before the fix: trace exists but stays QUEUED; sendTrace never retried.
    const tracesBefore = q.traces
    expect(tracesBefore.length).toBe(1)
    expect(tracesBefore[0].currentState).toBe(QueryTraceState.QUEUED)

    // No REQ should have been sent on the wire yet
    expect(conn.sentRequests.length).toBe(0)

    // Now the relay connects
    conn.open()
    pool.connectionOpened(conn)

    // Allow microtasks / event callbacks to process
    await sleep(10)

    // After fix: the trace should have been retried and sent
    expect(conn.sentRequests.length).toBeGreaterThanOrEqual(1)
    expect(conn.sentRequests[0][0]).toBe("REQ")
    expect(q.traces[0].currentState).toBe(QueryTraceState.WAITING)
  })

  /**
   * RACE CONDITION 2
   *
   * Multiple relays in the pool, all still connecting.
   * Query is issued before any of them are open.
   * After they all open, every relay should have received the REQ.
   */
  test("REQ is sent to all relays that were still connecting", async () => {
    const conn1 = new MockConnection("wss://relay1.test")
    const conn2 = new MockConnection("wss://relay2.test")
    pool.add(conn1)
    pool.add(conn2)

    const rb = makeRb("test-multi-connecting")
    const q = qm.query(rb)
    q.start()

    await sleep(50)

    // Both relays still connecting — 2 traces, both QUEUED
    expect(q.traces.length).toBe(2)
    expect(q.traces.every(t => t.currentState === QueryTraceState.QUEUED)).toBe(true)
    expect(conn1.sentRequests.length).toBe(0)
    expect(conn2.sentRequests.length).toBe(0)

    // Open both relays
    conn1.open()
    pool.connectionOpened(conn1)
    await sleep(10)

    conn2.open()
    pool.connectionOpened(conn2)
    await sleep(10)

    // After fix: both connections received the REQ
    expect(conn1.sentRequests.length).toBeGreaterThanOrEqual(1)
    expect(conn2.sentRequests.length).toBeGreaterThanOrEqual(1)
    expect(q.traces.every(t => t.currentState === QueryTraceState.WAITING)).toBe(true)
  })

  /**
   * RACE CONDITION 3
   *
   * Relay is already open when the query is issued (happy path).
   * Ensure the normal open-relay flow still works after the fix.
   */
  test("REQ is sent immediately when relay is already open", async () => {
    const conn = new MockConnection("wss://relay.test")
    conn.open() // already open before query
    pool.add(conn)

    const rb = makeRb("test-already-open")
    const q = qm.query(rb)
    q.start()

    await sleep(50)

    expect(conn.sentRequests.length).toBeGreaterThanOrEqual(1)
    expect(conn.sentRequests[0][0]).toBe("REQ")
    expect(q.traces[0].currentState).toBe(QueryTraceState.WAITING)
  })

  /**
   * KNOWN LIMITATION (not fixed by Option A):
   *
   * Relay is added to the pool AFTER the query is already running AND
   * the pool was empty when #sendToRelays ran — so no trace was ever
   * created for this connection. There is nothing in #pendingTraces to
   * retry, so the query is silently lost for this relay.
   *
   * A future Option C fix ("re-query on connect") would address this by
   * re-running active queries against newly-connected relays.
   */
  test.skip("pending trace is dispatched when relay is added after query started (known limitation)", async () => {
    // Start with no connections
    const rb = makeRb("test-new-relay")
    const q = qm.query(rb)
    q.start()

    await sleep(50)

    // No traces yet — no connections in pool
    expect(q.traces.length).toBe(0)

    // Now a relay is added and connects
    const conn = new MockConnection("wss://relay-late.test")
    pool.add(conn)

    conn.open()
    pool.connectionOpened(conn)

    await sleep(10)

    // Would require Option C to pass
    expect(conn.sentRequests.length).toBeGreaterThanOrEqual(1)
  })
})
