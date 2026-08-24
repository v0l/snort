/**
 * Tests for streaming (leaveOpen) subscriptions surviving a relay reconnect.
 *
 * The bug: `Connection.#reset()` clears its active REQ list on close and never
 * replays it, and `QueryManager`'s disconnect handler drops the matching
 * traces. Nothing ever re-sent them, so a long-lived query (live chat) went
 * permanently deaf on that relay after a single websocket blip — the query
 * object stays alive, so React never rebuilds it and events silently stop
 * arriving until the page is reloaded.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { CachedTable } from "@snort/shared"
import { EventEmitter } from "eventemitter3"
import { SocialGraph } from "nostr-social-graph"
import type { RelayInfoDocument, SystemInterface } from "../src"
import type { CachedMetadata, UsersFollows } from "../src/cache"
import type { RelaySettings } from "../src/connection"
import type { ConnectionPool, ConnectionPoolEvents, ConnectionType, ConnectionTypeEvents } from "../src/connection-pool"
import type { NostrEvent, OkResponse, ReqCommand } from "../src/nostr"
import type { RelayMetadataLoader } from "../src/outbox"
import type { ProfileLoaderService } from "../src/profile-cache"
import { QueryManager } from "../src/query-manager"
import { DefaultOptimizer } from "../src/query-optimizer"
import { RequestBuilder } from "../src/request-builder"
import type { SystemConfig, SystemSnapshot } from "../src/system"

/** Mock connection which can be closed and re-opened like a real websocket */
class MockConnection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
  id: string
  readonly address: string
  info: RelayInfoDocument | undefined = undefined
  settings: RelaySettings = { read: true, write: true }
  ephemeral = false

  #open: boolean
  #down = false

  sentRequests: Array<ReqCommand> = []
  activeRequests = new Set<string>()

  constructor(address: string, open = true) {
    super()
    this.id = crypto.randomUUID()
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
    return this.activeRequests.size
  }
  get maxSubscriptions() {
    return 20
  }

  async connect() {}
  close() {}
  async publish(ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", message: "", relay: this.address, event: ev }
  }

  request(req: ReqCommand, cbSent?: () => void) {
    if (!this.#open) return
    this.sentRequests.push(req)
    this.activeRequests.add(req[1])
    cbSent?.()
  }

  closeRequest(id: string) {
    this.activeRequests.delete(id)
  }
  sendRaw(_obj: object) {}

  /** Mirrors Connection.#onClose + #reset: drop active REQs, new connection id */
  simulateDisconnect() {
    this.#open = false
    for (const id of this.activeRequests) {
      this.emit("closed", id, "connection closed")
    }
    this.activeRequests.clear()
    this.id = crypto.randomUUID()
    this.emit("disconnect", 1006)
  }

  /** Mirrors Connection.connect + #onOpen: new connection id, "connected" */
  simulateReconnect() {
    this.id = crypto.randomUUID()
    this.#open = true
    this.emit("connected", true)
  }
}

class MockPool extends EventEmitter<ConnectionPoolEvents> implements ConnectionPool {
  #connections = new Map<string, MockConnection>()

  add(conn: MockConnection) {
    this.#connections.set(conn.address, conn)
    // Re-emit connection lifecycle on the pool, like ConnectionPool does
    conn.on("disconnect", code => this.emit("disconnect", conn.address, code))
    conn.on("connected", wasReconnect => this.emit("connected", conn.address, wasReconnect))
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
  async broadcastTo(address: string, ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", message: "", relay: address, event: ev }
  }

  *[Symbol.iterator]() {
    for (const kv of this.#connections) {
      yield kv
    }
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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeStreamingRb(id: string) {
  const rb = new RequestBuilder(id)
  rb.withOptions({ groupingDelay: 0, leaveOpen: true })
  rb.withFilter().kinds([1311]).tag("a", ["30311:aa:stream"]).limit(200)
  return rb
}

describe("QueryManager — streaming subscriptions across reconnects", () => {
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

  test("leaveOpen query is re-subscribed after the relay reconnects", async () => {
    const conn = new MockConnection("wss://relay.test")
    pool.add(conn)

    const q = qm.query(makeStreamingRb("stream:test"))
    q.start()
    await sleep(20)

    expect(conn.sentRequests.length).toBe(1)
    const firstSubId = conn.sentRequests[0][1]

    conn.simulateDisconnect()
    conn.simulateReconnect()
    await sleep(20)

    expect(conn.sentRequests.length).toBe(2)
    const second = conn.sentRequests[1]
    expect(second[0]).toBe("REQ")
    expect(second[1]).not.toBe(firstSubId)
    // Same filters as the original subscription
    expect(second[2]).toEqual({ kinds: [1311], "#a": ["30311:aa:stream"], limit: 200 })

    // Exactly one live trace for the relay — no stale duplicates
    expect(q.traces.filter(t => t.relay === conn.address).length).toBe(1)
  })

  test("events received after reconnect reach the feed", async () => {
    const conn = new MockConnection("wss://relay.test")
    pool.add(conn)

    const q = qm.query(makeStreamingRb("stream:test-events"))
    q.start()
    await sleep(20)

    conn.simulateDisconnect()
    conn.simulateReconnect()
    await sleep(20)

    const sub = conn.sentRequests[conn.sentRequests.length - 1][1]
    pool.emit("event", conn.address, sub, {
      id: "e1",
      kind: 1311,
      pubkey: "bb",
      created_at: 1000,
      content: "hello after reconnect",
      tags: [["a", "30311:aa:stream"]],
      sig: "",
      relays: [],
    })

    expect(q.feed.snapshot.map(a => a.id)).toContain("e1")
  })

  test("cancelled queries are not re-subscribed on reconnect", async () => {
    const conn = new MockConnection("wss://relay.test")
    pool.add(conn)

    const q = qm.query(makeStreamingRb("stream:test-cancelled"))
    q.start()
    await sleep(20)
    expect(conn.sentRequests.length).toBe(1)

    // cancel() sets cancelAt in the future; force it into the past
    q.cancel()
    await sleep(1100)

    conn.simulateDisconnect()
    conn.simulateReconnect()
    await sleep(20)

    expect(conn.sentRequests.length).toBe(1)
  })
})
