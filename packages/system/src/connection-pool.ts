import { removeUndefined, sanitizeRelayUrl, unwrap } from "@snort/shared";
import debug from "debug";
import { EventEmitter } from "eventemitter3";

import { Connection, RelaySettings, SyncCommand } from "./connection";
import { NostrEvent, OkResponse, ReqCommand, TaggedNostrEvent } from "./nostr";
import { RelayInfo, SystemInterface } from ".";
import { ConnectionSyncModule, DefaultSyncModule } from "./sync/connection";

/**
 * Events which the ConnectionType must emit
 */
export interface ConnectionTypeEvents {
  change: () => void;
  connected: (wasReconnect: boolean) => void;
  error: () => void;
  event: (sub: string, e: TaggedNostrEvent) => void;
  eose: (sub: string) => void;
  closed: (sub: string, reason: string) => void;
  disconnect: (code: number) => void;
  auth: (challenge: string, relay: string, cb: (ev: NostrEvent) => void) => void;
  notice: (msg: string) => void;
  unknownMessage: (obj: Array<any>) => void;
}

export interface ConnectionSubscription {}

/**
 * Basic relay connection
 */
export type ConnectionType = {
  readonly id: string;
  readonly address: string;
  readonly info: RelayInfo | undefined;
  readonly isDown: boolean;
  readonly isOpen: boolean;
  settings: RelaySettings;
  ephemeral: boolean;

  /**
   * Connect to relay
   */
  connect: () => Promise<void>;

  /**
   * Disconnect relay
   */
  close: () => void;

  /**
   * Publish an event to this relay
   */
  publish: (ev: NostrEvent, timeout?: number) => Promise<OkResponse>;

  /**
   * Queue request
   */
  request: (req: ReqCommand | SyncCommand, cbSent?: () => void) => void;

  /**
   * Close a request
   */
  closeRequest: (id: string) => void;
} & EventEmitter<ConnectionTypeEvents>;

/**
 * Events which are emitted by the connection pool
 */
export interface ConnectionPoolEvents {
  connected: (address: string, wasReconnect: boolean) => void;
  connectFailed: (address: string) => void;
  event: (address: string, sub: string, e: TaggedNostrEvent) => void;
  eose: (address: string, sub: string) => void;
  disconnect: (address: string, code: number) => void;
  auth: (address: string, challenge: string, relay: string, cb: (ev: NostrEvent) => void) => void;
  notice: (address: string, msg: string) => void;
}

/**
 * Base connection pool
 */
export type ConnectionPool = {
  getConnection(id: string): ConnectionType | undefined;
  connect(address: string, options: RelaySettings, ephemeral: boolean): Promise<ConnectionType | undefined>;
  disconnect(address: string): void;
  broadcast(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]>;
  broadcastTo(address: string, ev: NostrEvent): Promise<OkResponse>;
} & EventEmitter<ConnectionPoolEvents> &
  Iterable<[string, ConnectionType]>;

/**
 * Function for building new connections
 */
export type ConnectionBuilder<T extends ConnectionType> = (
  address: string,
  options: RelaySettings,
  ephemeral: boolean,
  syncModule?: ConnectionSyncModule,
) => Promise<T> | T;

/**
 * Simple connection pool containing connections to multiple nostr relays
 */
export class DefaultConnectionPool<T extends ConnectionType = Connection>
  extends EventEmitter<ConnectionPoolEvents>
  implements ConnectionPool
{
  #system: SystemInterface;
  #log = debug("ConnectionPool");

  /**
   * Track if a connection request has started
   */
  #connectStarted = new Set<string>();

  /**
   * All currently connected websockets
   */
  #sockets = new Map<string, T>();

  /**
   * Builder function to create new sockets
   */
  #connectionBuilder: ConnectionBuilder<T>;

  constructor(system: SystemInterface, builder?: ConnectionBuilder<T>) {
    super();
    this.#system = system;
    if (builder) {
      this.#connectionBuilder = builder;
    } else {
      this.#connectionBuilder = (addr, options, ephemeral) => {
        const sync = new DefaultSyncModule(this.#system.config.fallbackSync);
        return new Connection(addr, options, ephemeral, sync) as unknown as T;
      };
    }
  }

  /**
   * Get a connection object from the pool
   */
  getConnection(id: string) {
    const addr = unwrap(sanitizeRelayUrl(id));
    return this.#sockets.get(addr);
  }

  /**
   * Add a new relay to the pool
   */
  async connect(address: string, options: RelaySettings, ephemeral: boolean) {
    const addr = unwrap(sanitizeRelayUrl(address));
    if (this.#connectStarted.has(addr)) return;
    this.#connectStarted.add(addr);

    try {
      const existing = this.#sockets.get(addr);
      if (!existing) {
        const c = await this.#connectionBuilder(addr, options, ephemeral);
        this.#sockets.set(addr, c);
        c.on("event", (s, e) => {
          if (this.#system.checkSigs && !this.#system.optimizer.schnorrVerify(e)) {
            this.#log("Reject invalid event %o", e);
            return;
          }
          this.emit("event", addr, s, e);
        });
        c.on("eose", s => this.emit("eose", addr, s));
        c.on("disconnect", code => this.emit("disconnect", addr, code));
        c.on("connected", r => this.emit("connected", addr, r));
        c.on("auth", (cx, r, cb) => this.emit("auth", addr, cx, r, cb));
        await c.connect();
        return c;
      } else {
        // update settings if already connected
        existing.settings = options;
        // upgrade to non-ephemeral, never downgrade
        if (existing.ephemeral && !ephemeral) {
          existing.ephemeral = ephemeral;
        }
        // re-open if closed
        if (existing.ephemeral && !existing.isOpen) {
          await existing.connect();
        }
        return existing;
      }
    } catch (e) {
      console.error(e);
      this.#log("%O", e);
      this.emit("connectFailed", addr);
      this.#sockets.delete(addr);
    } finally {
      this.#connectStarted.delete(addr);
    }
  }

  /**
   * Remove relay from pool
   */
  disconnect(address: string) {
    const addr = unwrap(sanitizeRelayUrl(address));
    const c = this.#sockets.get(addr);
    if (c) {
      this.#sockets.delete(addr);
      c.close();
    }
  }

  /**
   * Broadcast event to all write relays.
   * @remarks Also write event to read relays of those who are `p` tagged in the event (Inbox model)
   */
  async broadcast(ev: NostrEvent, cb?: (rsp: OkResponse) => void) {
    const writeRelays = [...this.#sockets.values()].filter(a => !a.ephemeral && a.settings.write);
    const replyRelays = (await this.#system.requestRouter?.forReply(ev)) ?? [];
    const oks = await Promise.all([
      ...writeRelays.map(async s => {
        try {
          const rsp = await s.publish(ev);
          cb?.(rsp);
          return rsp;
        } catch (e) {
          console.error(e);
        }
        return;
      }),
      ...replyRelays?.filter(a => !this.#sockets.has(unwrap(sanitizeRelayUrl(a)))).map(a => this.broadcastTo(a, ev)),
    ]);
    return removeUndefined(oks);
  }

  /**
   * Send event to specific relay
   */
  async broadcastTo(address: string, ev: NostrEvent): Promise<OkResponse> {
    const addrClean = sanitizeRelayUrl(address);
    if (!addrClean) {
      throw new Error("Invalid relay address");
    }

    const existing = this.#sockets.get(addrClean);
    if (existing) {
      return await existing.publish(ev);
    } else {
      return await new Promise<OkResponse>(async (resolve, reject) => {
        const c = await this.#connectionBuilder(address, { write: true, read: true }, true);

        const t = setTimeout(reject, 10_000);
        c.once("connected", async () => {
          clearTimeout(t);
          const rsp = await c.publish(ev);
          c.close();
          resolve(rsp);
        });
        c.connect();
      });
    }
  }

  *[Symbol.iterator]() {
    for (const kv of this.#sockets) {
      yield kv;
    }
  }
}
