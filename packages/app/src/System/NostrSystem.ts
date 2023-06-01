import debug from "debug";
import { v4 as uuid } from "uuid";

import ExternalStore from "ExternalStore";
import { RawEvent, RawReqFilter, TaggedRawEvent } from "./Nostr";
import { AuthHandler, Connection, RelaySettings, ConnectionStateSnapshot } from "./Connection";
import { Query, QueryBase } from "./Query";
import { RelayCache } from "./GossipModel";
import { NoteStore } from "./NoteCollection";
import { BuiltRawReqFilter, RequestBuilder } from "./RequestBuilder";
import { unwrap, sanitizeRelayUrl, unixNowMs } from "./Util";
import { SystemInterface, SystemSnapshot } from "System";

/**
 * Manages nostr content retrieval system
 */
export class NostrSystem extends ExternalStore<SystemSnapshot> implements SystemInterface {
  /**
   * All currently connected websockets
   */
  #sockets = new Map<string, Connection>();

  /**
   * All active queries
   */
  Queries: Map<string, Query> = new Map();

  /**
   * Handler function for NIP-42
   */
  HandleAuth?: AuthHandler;

  #log = debug("System");
  #relayCache: RelayCache;

  constructor(relayCache: RelayCache) {
    super();
    this.#relayCache = relayCache;
    this.#cleanup();
  }

  get Sockets(): ConnectionStateSnapshot[] {
    return [...this.#sockets.values()].map(a => a.snapshot());
  }

  /**
   * Connect to a NOSTR relay if not already connected
   */
  async ConnectToRelay(address: string, options: RelaySettings) {
    try {
      const addr = unwrap(sanitizeRelayUrl(address));
      if (!this.#sockets.has(addr)) {
        const c = new Connection(addr, options, this.HandleAuth?.bind(this));
        this.#sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnDisconnect = id => this.OnRelayDisconnect(id);
        await c.Connect();
      } else {
        // update settings if already connected
        unwrap(this.#sockets.get(addr)).Settings = options;
      }
    } catch (e) {
      console.error(e);
    }
  }

  OnRelayDisconnect(id: string) {
    for (const [, q] of this.Queries) {
      q.connectionLost(id);
    }
  }

  OnEndOfStoredEvents(c: Readonly<Connection>, sub: string) {
    for (const [, v] of this.Queries) {
      v.eose(sub, c);
    }
  }

  OnEvent(sub: string, ev: TaggedRawEvent) {
    for (const [, v] of this.Queries) {
      v.onEvent(sub, ev);
    }
  }

  /**
   *
   * @param address Relay address URL
   */
  async ConnectEphemeralRelay(address: string): Promise<Connection | undefined> {
    try {
      const addr = unwrap(sanitizeRelayUrl(address));
      if (!this.#sockets.has(addr)) {
        const c = new Connection(addr, { read: true, write: false }, this.HandleAuth?.bind(this), true);
        this.#sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnDisconnect = id => this.OnRelayDisconnect(id);
        await c.Connect();
        return c;
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Disconnect from a relay
   */
  DisconnectRelay(address: string) {
    const c = this.#sockets.get(address);
    if (c) {
      this.#sockets.delete(address);
      c.Close();
    }
  }

  GetQuery(id: string): Query | undefined {
    return this.Queries.get(id);
  }

  Query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder | null): Query | undefined {
    if (!req) return;

    const existing = this.Queries.get(req.id);
    if (existing) {
      const filters = req.buildDiff(this.#relayCache, existing.filters);
      if (filters.length === 0 && !req.options?.skipDiff) {
        return existing;
      } else {
        for (const subQ of filters) {
          this.SendQuery(existing, subQ).then(qta =>
            qta.forEach(v => this.#log("New QT from diff %s %s %O from: %O", req.id, v.id, v.filters, existing.filters))
          );
        }
        this.notifyChange();
        return existing;
      }
    } else {
      const store = new type();

      const filters = req.build(this.#relayCache);
      const q = new Query(req.id, store);
      if (req.options?.leaveOpen) {
        q.leaveOpen = req.options.leaveOpen;
      }

      this.Queries.set(req.id, q);
      for (const subQ of filters) {
        this.SendQuery(q, subQ).then(qta =>
          qta.forEach(v => this.#log("New QT from diff %s %s %O", req.id, v.id, v.filters))
        );
      }
      this.notifyChange();
      return q;
    }
  }

  async SendQuery(q: Query, qSend: BuiltRawReqFilter) {
    if (qSend.relay) {
      this.#log("Sending query to %s %O", qSend.relay, qSend);
      const s = this.#sockets.get(qSend.relay);
      if (s) {
        const qt = q.sendToRelay(s, qSend);
        if (qt) {
          return [qt];
        }
      } else {
        const nc = await this.ConnectEphemeralRelay(qSend.relay);
        if (nc) {
          const qt = q.sendToRelay(nc, qSend);
          if (qt) {
            return [qt];
          }
        } else {
          console.warn("Failed to connect to new relay for:", qSend.relay, q);
        }
      }
    } else {
      const ret = [];
      for (const [, s] of this.#sockets) {
        if (!s.Ephemeral) {
          const qt = q.sendToRelay(s, qSend);
          if (qt) {
            ret.push(qt);
          }
        }
      }
      return ret;
    }
    return [];
  }

  /**
   * Send events to writable relays
   */
  BroadcastEvent(ev: RawEvent) {
    for (const [, s] of this.#sockets) {
      s.SendEvent(ev);
    }
  }

  /**
   * Write an event to a relay then disconnect
   */
  async WriteOnceToRelay(address: string, ev: RawEvent) {
    return new Promise<void>((resolve, reject) => {
      const c = new Connection(address, { write: true, read: false }, this.HandleAuth, true);

      const t = setTimeout(reject, 5_000);
      c.OnConnected = async () => {
        clearTimeout(t);
        await c.SendAsync(ev);
        c.Close();
        resolve();
      };
      c.Connect();
    });
  }

  takeSnapshot(): SystemSnapshot {
    return {
      queries: [...this.Queries.values()].map(a => {
        return {
          id: a.id,
          filters: a.filters,
          closing: a.closing,
          subFilters: [],
        };
      }),
    };
  }

  #cleanup() {
    const now = unixNowMs();
    let changed = false;
    for (const [k, v] of this.Queries) {
      if (v.closingAt && v.closingAt < now) {
        v.sendClose();
        this.Queries.delete(k);
        changed = true;
      }
    }
    if (changed) {
      this.notifyChange();
    }
    setTimeout(() => this.#cleanup(), 1_000);
  }
}
