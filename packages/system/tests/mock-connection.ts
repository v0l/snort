import { EventEmitter } from "eventemitter3"
import type { RelayInfoDocument, RelaySettings } from "../src"
import type { ConnectionPool, ConnectionPoolEvents, ConnectionType, ConnectionTypeEvents } from "../src/connection-pool"
import type { NostrEvent, OkResponse, ReqCommand, TaggedNostrEvent } from "../src/nostr"

/**
 * Mock relay connection for testing
 * Simulates WebSocket behavior without actual network calls
 */
export class MockConnection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
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

  async connect() {
    // No-op: connection state controlled by open() method
  }

  close() {
    this.#open = false
    this.emit("disconnect", 1000)
  }

  async publish(_ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: "", message: "", relay: this.address, event: _ev }
  }

  request(req: ReqCommand, cbSent?: () => void) {
    if (!this.#open) {
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
    if (this.#open) return
    this.#open = true
    // Drain pending queue
    for (const req of this.pendingRequests) {
      this.sentRequests.push(req)
    }
    this.pendingRequests = []
    this.emit("connected", false)
    this.emit("change")
  }

  /** Simulate receiving an event from the relay */
  receiveEvent(sub: string, event: TaggedNostrEvent) {
    if (!this.#open) return
    this.emit("unverifiedEvent", sub, event)
  }

  /** Simulate end of stored events */
  eose(sub: string) {
    if (!this.#open) return
    this.emit("eose", sub)
  }

  /** Simulate closing a subscription */
  closeSubscription(sub: string, reason: string) {
    if (!this.#open) return
    this.emit("closed", sub, reason)
  }
}

/**
 * Mock connection pool for testing
 */
export class MockPool extends EventEmitter<ConnectionPoolEvents> implements ConnectionPool {
  #connections = new Map<string, MockConnection>()
  #defaultSettings: RelaySettings = { read: true, write: true }

  add(conn: MockConnection) {
    this.#connections.set(conn.address, conn)
  }

  remove(address: string) {
    this.#connections.delete(address)
  }

  getConnection(id: string): ConnectionType | undefined {
    return this.#connections.get(id)
  }

  async connect(address: string, _options: RelaySettings, _ephemeral: boolean) {
    let conn = this.#connections.get(address)
    if (!conn) {
      conn = new MockConnection(address)
      this.#connections.set(address, conn)
    }
    return conn
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

  /** Get all connections */
  getAll(): MockConnection[] {
    return Array.from(this.#connections.values())
  }

  /** Clear all connections */
  clear() {
    this.#connections.clear()
  }

  /** Simulate pool connected event */
  connectionOpened(conn: MockConnection) {
    this.emit("connected", conn.address, false)
  }
}
