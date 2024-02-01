import { removeUndefined, sanitizeRelayUrl, unwrap } from "@snort/shared";
import debug from "debug";
import EventEmitter from "eventemitter3";

import { Connection, RelaySettings } from "./connection";
import { NostrEvent, OkResponse, TaggedNostrEvent } from "./nostr";
import { pickRelaysForReply } from "./outbox-model";
import { SystemInterface } from ".";
import LRUSet from "@snort/shared/src/LRUSet";

export interface NostrConnectionPoolEvents {
  connected: (address: string, wasReconnect: boolean) => void;
  connectFailed: (address: string) => void;
  event: (address: string, sub: string, e: TaggedNostrEvent) => void;
  eose: (address: string, sub: string) => void;
  disconnect: (address: string, code: number) => void;
  auth: (address: string, challenge: string, relay: string, cb: (ev: NostrEvent) => void) => void;
  notice: (address: string, msg: string) => void;
}

export type ConnectionPool = {
  getConnection(id: string): Connection | undefined;
  connect(address: string, options: RelaySettings, ephemeral: boolean): Promise<Connection | undefined>;
  disconnect(address: string): void;
  broadcast(system: SystemInterface, ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]>;
  broadcastTo(address: string, ev: NostrEvent): Promise<OkResponse>;
} & EventEmitter<NostrConnectionPoolEvents> &
  Iterable<[string, Connection]>;

/**
 * Simple connection pool containing connections to multiple nostr relays
 */
export class DefaultConnectionPool extends EventEmitter<NostrConnectionPoolEvents> implements ConnectionPool {
  #system: SystemInterface;

  #log = debug("NostrConnectionPool");

  /**
   * All currently connected websockets
   */
  #sockets = new Map<string, Connection>();
  #requestedIds = new LRUSet<string>(1000);

  constructor(system: SystemInterface) {
    super();
    this.#system = system;
  }

  /**
   * Get a connection object from the pool
   */
  getConnection(id: string) {
    return this.#sockets.get(id);
  }

  /**
   * Add a new relay to the pool
   */
  async connect(address: string, options: RelaySettings, ephemeral: boolean) {
    const addr = unwrap(sanitizeRelayUrl(address));
    try {
      const existing = this.#sockets.get(addr);
      if (!existing) {
        const c = new Connection(addr, options, ephemeral);
        this.#sockets.set(addr, c);

        c.on("event", (s, e) => {
          if (this.#system.checkSigs && !this.#system.optimizer.schnorrVerify(e)) {
            this.#log("Reject invalid event %o", e);
            return;
          }
          this.emit("event", addr, s, e);
        });
        c.on("have", async (s, id) => {
          this.#log("%s have: %s %o", c.Address, s, id);
          if (this.#requestedIds.has(id)) {
            this.#log("HAVE: Already requested from another relay %s", id);
            // TODO if request to a relay fails, try another relay. otherwise malicious relays can block content.
            return;
          }
          this.#requestedIds.add(id);
          // is this performant? should it be batched?
          const alreadyHave = await this.#system.cacheRelay?.query(["REQ", id, { ids: [id] }]);
          if (alreadyHave?.length) {
            this.#log("HAVE: Already have %s", id);
            return;
          }
          this.#log("HAVE: GET requesting %s", id);
          c.queueReq(["GET", id], () => {});
        });
        c.on("eose", s => this.emit("eose", addr, s));
        c.on("disconnect", code => this.emit("disconnect", addr, code));
        c.on("connected", r => this.emit("connected", addr, r));
        c.on("auth", (cx, r, cb) => this.emit("auth", addr, cx, r, cb));
        await c.connect();
        return c;
      } else {
        // update settings if already connected
        existing.Settings = options;
        // upgrade to non-ephemeral, never downgrade
        if (existing.Ephemeral && !ephemeral) {
          existing.Ephemeral = ephemeral;
        }
        return existing;
      }
    } catch (e) {
      this.#log("%O", e);
      this.emit("connectFailed", addr);
      this.#sockets.delete(addr);
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
  async broadcast(system: SystemInterface, ev: NostrEvent, cb?: (rsp: OkResponse) => void) {
    const writeRelays = [...this.#sockets.values()].filter(a => !a.Ephemeral && a.Settings.write);
    const replyRelays = await pickRelaysForReply(ev, system);
    const oks = await Promise.all([
      ...writeRelays.map(async s => {
        try {
          const rsp = await s.sendEventAsync(ev);
          cb?.(rsp);
          return rsp;
        } catch (e) {
          console.error(e);
        }
        return;
      }),
      ...replyRelays.filter(a => !this.#sockets.has(unwrap(sanitizeRelayUrl(a)))).map(a => this.broadcastTo(a, ev)),
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
      return await existing.sendEventAsync(ev);
    } else {
      return await new Promise<OkResponse>((resolve, reject) => {
        const c = new Connection(address, { write: true, read: true }, true);

        const t = setTimeout(reject, 10_000);
        c.once("connected", async () => {
          clearTimeout(t);
          const rsp = await c.sendEventAsync(ev);
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
