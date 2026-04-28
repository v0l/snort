/**
 * Tests for the bug where background loader queries time out because
 * REQ messages are never actually sent on the wire.
 *
 * Root cause: Connection.#send() queues messages in PendingRaw when
 * auth_pending is true (because info.limitation.auth_required=true).
 * But Connection only processes AUTH challenges when #expectAuth is set,
 * which only happens for DM/GiftWrap/kind-7000 queries.
 *
 * A kind-0 (profile metadata) query never sets #expectAuth. So:
 *   1. Connection sees auth_required=true in NIP-11 → auth_pending=true
 *   2. REQ goes to PendingRaw instead of the wire
 *   3. Relay sends AUTH challenge → Connection ignores it (#expectAuth=false)
 *   4. PendingRaw never drained → REQ never sent → query times out
 *
 * This is the exact error seen in the browser:
 *   "QueryManager.fetch() timed out after 30000ms — EOSE never received"
 */

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
import { QueryTraceState } from "../src/query"
import { QueryManager } from "../src/query-manager"
import { DefaultOptimizer } from "../src/query-optimizer"
import { RequestBuilder } from "../src/request-builder"
import type { RequestRouter } from "../src/request-router"
import type { SystemConfig, SystemInterface } from "../src/system"

// ---------------------------------------------------------------------------
// Mock connection that faithfully replicates Connection's auth behavior
// ---------------------------------------------------------------------------

type ReqFilter = { kinds?: number[]; authors?: string[]; [key: string]: any }

class MockConnection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
  id = crypto.randomUUID()
  readonly address: string
  info: RelayInfoDocument | undefined = undefined
  settings: RelaySettings = { read: true, write: true }
  ephemeral = false
  Authed = false
  AwaitingAuth: Map<string, boolean> = new Map()
  #open: boolean
  #expectAuth = false

  /** Messages actually sent on the WebSocket */
  wireMessages: object[] = []
  /** Messages queued in PendingRaw (mirrors Connection.PendingRaw) */
  PendingRaw: object[] = []

  constructor(address: string, open = true, authRequired = false) {
    super()
    this.address = address
    this.#open = open
    if (authRequired) {
      this.info = { limitation: { auth_required: true } } as any
    }
  }

  get isOpen() { return this.#open }
  get isDown() { return false }
  get activeSubscriptions() {
    return this.wireMessages.filter(m => Array.isArray(m) && m[0] === "REQ").length
  }
  get maxSubscriptions() { return 20 }

  open() {
    this.#open = true
    this.#sendPendingRaw()
    this.emit("connected", false)
    this.emit("change")
  }

  /**
   * Faithfully replicates Connection.request():
   * - Sets #expectAuth for DM/GiftWrap/kind-7000
   * - Calls #sendRequestCommand → #send
   * - Calls cbSent REGARDLESS of whether message went to PendingRaw
   */
  request(cmd: ReqCommand, cbSent?: () => void) {
    const filters = cmd.slice(2) as Array<ReqFilter>
    const requestKinds = new Set(filters.flatMap((a: any) => a.kinds ?? []))
    const ExpectAuth = [4, 1059, 7000]
    if (ExpectAuth.some(a => requestKinds.has(a)) && !this.#expectAuth) {
      this.#expectAuth = true
    }
    this.#send(cmd)
    cbSent?.()
    this.emit("change")
  }

  /**
   * Faithfully replicates Connection.#send():
   * If !isOpen OR authPending → push to PendingRaw
   * Otherwise → drain PendingRaw + send on wire
   */
  #send(obj: object) {
    const authPending =
      !this.Authed &&
      (this.AwaitingAuth.size > 0 || (this.info as any)?.limitation?.auth_required === true)
    if (!this.isOpen || authPending) {
      this.PendingRaw.push(obj)
      return false
    }
    this.#sendPendingRaw()
    this.wireMessages.push(obj)
  }

  #sendPendingRaw() {
    while (this.PendingRaw.length > 0) {
      const next = this.PendingRaw.shift()
      if (next) this.wireMessages.push(next)
    }
  }

  /** Simulate receiving an AUTH challenge from the relay */
  receiveAuthChallenge(challenge: string) {
    if (this.#expectAuth) {
      this.AwaitingAuth.set(challenge, true)
    } else {
      // FIX: unexpected AUTH → close all subscriptions that don't require auth
      // (mirrors the fix in Connection.#onMessage)
      this.#closeUnexpectedAuthSubscriptions()
    }
  }

  /**
   * Close all active subscriptions when an unexpected AUTH challenge arrives.
   * Mirrors the fix in Connection.#onMessage for the !#expectAuth case.
   */
  #closeUnexpectedAuthSubscriptions() {
    // Close each request — mirrors Connection.closeRequest()
    // which sends CLOSE and emits "eose" for the subscription
    const ids = this.wireMessages
      .filter(m => Array.isArray(m) && m[0] === "REQ")
      .map(m => (m as any[])[1])
      // Also include requests stuck in PendingRaw
      .concat(
        this.PendingRaw
          .filter(m => Array.isArray(m) && m[0] === "REQ")
          .map(m => (m as any[])[1])
      )

    for (const id of ids) {
      this.emit("eose", id) // triggers trace.eose() → trace finishes
    }

    // Clear PendingRaw — nothing to send anymore
    this.PendingRaw = []
    // Clear wire messages tracking for closed subs
    this.wireMessages = this.wireMessages.filter(
      m => !Array.isArray(m) || m[0] !== "REQ"
    )
  }

  /** Simulate successful auth completion */
  completeAuth() {
    this.Authed = true
    this.AwaitingAuth.clear()
    this.#sendPendingRaw()
  }

  async connect() {}
  close() {}
  async publish(ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", relay: this.address, event: ev }
  }
  closeRequest(_id: string) {}
  sendRaw(obj: object) { this.#send(obj) }
}

// ---------------------------------------------------------------------------
// Mock pool
// ---------------------------------------------------------------------------

class SimplePool extends EventEmitter<ConnectionPoolEvents> implements ConnectionPool {
  #conns = new Map<string, MockConnection>()

  add(conn: MockConnection) {
    this.#conns.set(conn.address, conn)
    conn.on("connected", r => this.emit("connected", conn.address, r))
    conn.on("eose", s => this.emit("eose", conn.address, s))
    conn.on("disconnect", code => this.emit("disconnect", conn.address, code))
    conn.on("unverifiedEvent", (s, e) => this.emit("event", conn.address, s, e))
    conn.on("closed", (sub, reason) => this.emit("event", conn.address, sub, reason as any))
  }

  getConnection(id: string) { return this.#conns.get(id) }

  async connect(address: string, options: RelaySettings, ephemeral: boolean) {
    let conn = this.#conns.get(address)
    if (!conn) {
      conn = new MockConnection(address, false)
      conn.ephemeral = ephemeral
      conn.settings = options
      this.add(conn)
    } else {
      conn.settings = options
      if (conn.ephemeral && !ephemeral) conn.ephemeral = ephemeral
    }
    return conn
  }

  disconnect(_a: string) {}
  async broadcast(): Promise<OkResponse[]> { return [] }
  async broadcastTo(_a: string, ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", relay: _a, event: ev }
  }

  *[Symbol.iterator]() { yield* this.#conns }
}

// ---------------------------------------------------------------------------
// Mock system
// ---------------------------------------------------------------------------

function makeSystem(pool: SimplePool): SystemInterface {
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
    pool, config, cacheRelay: undefined, requestRouter: undefined,
    checkSigs: false, optimizer: DefaultOptimizer,
    relayLoader: { TrackKeys: () => {} } as unknown as RelayMetadataLoader,
    profileLoader: {} as ProfileLoaderService,
    userFollowsCache: {} as CachedTable<UsersFollows>,
    traceTimeline: undefined,
    async Init() {}, GetQuery: () => undefined,
    Query: () => { throw new Error("not used") },
    Fetch: () => Promise.resolve([]),
    async ConnectToRelay() {}, DisconnectRelay() {}, HandleEvent() {},
    async BroadcastEvent() { return [] },
    async WriteOnceToRelay() { return { ok: true, id: "", message: "", relay: "" } },
    emit: () => false, on: () => ({}) as any, off: () => ({}) as any,
    once: () => ({}) as any, removeAllListeners: () => ({}) as any,
    listeners: () => [], listenerCount: () => 0, eventNames: () => [],
    addListener: () => ({}) as any, removeListener: () => ({}) as any,
  } as unknown as SystemInterface
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function pubkey(i: number) { return i.toString(16).padStart(64, "0") }

// ---------------------------------------------------------------------------
// Tests: demonstrate the CURRENT (broken) behavior
// ---------------------------------------------------------------------------

describe("Connection — auth_required deadlock for non-DM queries", () => {
  test("kind-0 REQ on auth_required relay: message stuck in PendingRaw until AUTH challenge closes it", () => {
    const conn = new MockConnection("wss://auth-relay.test", true, true)

    // kind 0 (SetMetadata/profile) — does NOT set #expectAuth
    conn.request(["REQ", "sub-1", { kinds: [0], authors: [pubkey(1)] }], () => {})

    // Message goes to PendingRaw because auth_required=true
    expect(conn.PendingRaw.length).toBe(1)
    expect(conn.wireMessages.length).toBe(0)

    // When relay sends unexpected AUTH, subscriptions are closed
    conn.receiveAuthChallenge("challenge-1")
    expect(conn.PendingRaw.length).toBe(0)
    expect(conn.activeSubscriptions).toBe(0)
  })

  test("kind-4 REQ also stuck until auth completes (but at least #expectAuth is set)", () => {
    const conn = new MockConnection("wss://auth-relay.test", true, true)

    // kind 4 (DM) — sets #expectAuth, so AUTH challenge will be processed
    conn.request(["REQ", "sub-2", { kinds: [4], authors: [pubkey(1)] }], () => {})

    // Still in PendingRaw because Authed=false and auth_required=true
    expect(conn.PendingRaw.length).toBe(1)
    expect(conn.wireMessages.length).toBe(0)

    // But AUTH challenge IS processed (#expectAuth=true), so auth flow can complete
    conn.receiveAuthChallenge("challenge-1")
    expect(conn.AwaitingAuth.size).toBe(1) // challenge was accepted
  })

  test("AUTH challenge on non-expectAuth connection: subscriptions are closed", () => {
    const conn = new MockConnection("wss://auth-relay.test", true, true)

    // kind 0 — #expectAuth stays false
    conn.request(["REQ", "sub-4", { kinds: [0], authors: [pubkey(1)] }], () => {})
    expect(conn.PendingRaw.length).toBe(1)

    // Relay sends AUTH challenge
    conn.receiveAuthChallenge("challenge-123")

    // FIX: unexpected AUTH closes all subscriptions that don't require auth
    // (this triggers "eose" on the connection for each closed sub,
    //  which lets the query trace finish and the query progress)
    expect(conn.wireMessages.length).toBe(0) // still nothing on wire
    expect(conn.PendingRaw.length).toBe(0) // PendingRaw cleared by closeRequest
    expect(conn.activeSubscriptions).toBe(0) // sub was closed
  })

  test("after auth completes, PendingRaw is drained and messages sent", () => {
    const conn = new MockConnection("wss://auth-relay.test", true, true)

    conn.request(["REQ", "sub-3", { kinds: [0], authors: [pubkey(1)] }], () => {})
    expect(conn.PendingRaw.length).toBe(1)

    // Simulate auth completing (e.g. user signs auth event)
    conn.completeAuth()

    expect(conn.wireMessages.length).toBe(1)
    expect(conn.PendingRaw.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Tests: full QueryManager flow with auth_required relay
// ---------------------------------------------------------------------------

describe("QueryManager — fetch() on auth_required relay", () => {
  let pool: SimplePool
  let system: SystemInterface
  let qm: QueryManager

  beforeEach(() => {
    pool = new SimplePool()
    system = makeSystem(pool)
    qm = new QueryManager(system)
  })

  afterEach(() => {
    qm.destroy()
  })

  test("kind-0 query on auth_required relay: unexpected AUTH closes subscription, query resolves", async () => {
    const conn = new MockConnection("wss://auth-relay.test", true, true)
    conn.ephemeral = false
    pool.add(conn)

    const rb = new RequestBuilder("auth-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([0]).authors([pubkey(1)])

    const q = qm.query(rb)
    q.start()

    await sleep(100)

    // Trace appears WAITING (cbSent called), but REQ stuck in PendingRaw
    expect(q.traces.length).toBe(1)
    expect(q.traces[0].currentState).toBe(QueryTraceState.WAITING)
    expect(conn.PendingRaw.length).toBe(1)

    // Relay sends unexpected AUTH challenge
    conn.receiveAuthChallenge("challenge-123")

    // FIX: subscription is closed, trace finishes
    expect(conn.PendingRaw.length).toBe(0)
    expect(q.traces[0].currentState).toBe(QueryTraceState.LOCAL_CLOSE)
  })

  test("after auth completes, stuck REQ is sent and fetch resolves", async () => {
    const conn = new MockConnection("wss://auth-relay.test", true, true)
    conn.ephemeral = false
    pool.add(conn)

    const rb = new RequestBuilder("auth-fetch-resolve")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([0]).authors([pubkey(1)])

    const fetchPromise = qm.fetch(rb)

    await sleep(100)

    // REQ is stuck
    expect(conn.PendingRaw.length).toBe(1)

    // Complete auth
    conn.completeAuth()

    await sleep(50)

    // Now REQ is on the wire
    expect(conn.wireMessages.length).toBe(1)

    // Simulate EOSE
    const subId = (conn.wireMessages[0] as any[])[1] as string
    conn.emit("eose", subId)

    const results = await fetchPromise
    expect(results).toBeDefined()
  })

  test("kind-0 query on non-auth relay: REQ sent immediately", async () => {
    const conn = new MockConnection("wss://normal-relay.test", true, false)
    conn.ephemeral = false
    pool.add(conn)

    const rb = new RequestBuilder("normal-test")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([0]).authors([pubkey(1)])

    const q = qm.query(rb)
    q.start()

    await sleep(100)

    expect(q.traces.length).toBe(1)
    expect(q.traces[0].currentState).toBe(QueryTraceState.WAITING)
    expect(conn.wireMessages.length).toBe(1)
    expect(conn.PendingRaw.length).toBe(0)
  })
})
