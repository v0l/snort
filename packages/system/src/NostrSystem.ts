import debug from "debug";

import { unwrap, sanitizeRelayUrl, ExternalStore, FeedCache } from "@snort/shared";
import { NostrEvent, TaggedRawEvent } from "./Nostr";
import { AuthHandler, Connection, RelaySettings, ConnectionStateSnapshot } from "./Connection";
import { Query } from "./Query";
import { RelayCache } from "./GossipModel";
import { NoteStore } from "./NoteCollection";
import { BuiltRawReqFilter, RequestBuilder } from "./RequestBuilder";
import { RelayMetricHandler } from "./RelayMetricHandler";
import {
  MetadataCache,
  ProfileLoaderService,
  RelayMetrics,
  SystemInterface,
  SystemSnapshot,
  UserProfileCache,
  UserRelaysCache,
  RelayMetricCache
} from ".";

/**
 * Manages nostr content retrieval system
 */
export class NostrSystem extends ExternalStore<SystemSnapshot> implements SystemInterface {
  #log = debug("System");

  /**
   * All currently connected websockets
   */
  #sockets = new Map<string, Connection>();

  /**
   * All active queries
   */
  Queries: Map<string, Query> = new Map();

  /**
   * NIP-42 Auth handler
   */
  #handleAuth?: AuthHandler;

  /**
   * Storage class for user relay lists
   */
  #relayCache: RelayCache;

  /**
   * Storage class for user profiles
   */
  #profileCache: FeedCache<MetadataCache>;

  /**
   * Storage class for relay metrics (connects/disconnects)
   */
  #relayMetricsCache: FeedCache<RelayMetrics>;

  /**
   * Profile loading service
   */
  #profileLoader: ProfileLoaderService;

  /**
   * Relay metrics handler cache
   */
  #relayMetrics: RelayMetricHandler;

  constructor(props: {
    authHandler?: AuthHandler,
    relayCache?: RelayCache,
    profileCache?: FeedCache<MetadataCache>
    relayMetrics?: FeedCache<RelayMetrics>
  }) {
    super();
    this.#handleAuth = props.authHandler;
    this.#relayCache = props.relayCache ?? new UserRelaysCache();
    this.#profileCache = props.profileCache ?? new UserProfileCache();
    this.#relayMetricsCache = props.relayMetrics ?? new RelayMetricCache();

    this.#profileLoader = new ProfileLoaderService(this, this.#profileCache);
    this.#relayMetrics = new RelayMetricHandler(this.#relayMetricsCache);
    this.#cleanup();
  }

  /**
   * Profile loader service allows you to request profiles
   */
  get ProfileLoader() {
    return this.#profileLoader;
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
        const c = new Connection(addr, options, this.#handleAuth?.bind(this));
        this.#sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnDisconnect = (code) => this.OnRelayDisconnect(c, code);
        await c.Connect();
      } else {
        // update settings if already connected
        unwrap(this.#sockets.get(addr)).Settings = options;
      }
    } catch (e) {
      console.error(e);
    }
  }

  OnRelayDisconnect(c: Connection, code: number) {
    this.#relayMetrics.onDisconnect(c, code);
    for (const [, q] of this.Queries) {
      q.connectionLost(c.Id);
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
        const c = new Connection(addr, { read: true, write: false }, this.#handleAuth?.bind(this), true);
        this.#sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnDisconnect = code => this.OnRelayDisconnect(c, code);
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

  Query<T extends NoteStore>(type: { new(): T }, req: RequestBuilder): Query {
    const existing = this.Queries.get(req.id);
    if (existing) {
      // if same instance, just return query
      if (existing.fromInstance === req.instance) {
        return existing;
      }
      const filters = !req.options?.skipDiff
        ? req.buildDiff(this.#relayCache, existing.flatFilters)
        : req.build(this.#relayCache);
      if (filters.length === 0 && !!req.options?.skipDiff) {
        return existing;
      } else {
        for (const subQ of filters) {
          this.SendQuery(existing, subQ);
        }
        this.notifyChange();
        return existing;
      }
    } else {
      const store = new type();

      const filters = req.build(this.#relayCache);
      const q = new Query(req.id, req.instance, store, req.options?.leaveOpen);
      this.Queries.set(req.id, q);
      for (const subQ of filters) {
        this.SendQuery(q, subQ);
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
      for (const [a, s] of this.#sockets) {
        if (!s.Ephemeral) {
          this.#log("Sending query to %s %O", a, qSend);
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
  BroadcastEvent(ev: NostrEvent) {
    for (const [, s] of this.#sockets) {
      s.SendEvent(ev);
    }
  }

  /**
   * Write an event to a relay then disconnect
   */
  async WriteOnceToRelay(address: string, ev: NostrEvent) {
    return new Promise<void>((resolve, reject) => {
      const c = new Connection(address, { write: true, read: false }, this.#handleAuth?.bind(this), true);

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
          subFilters: [],
        };
      }),
    };
  }

  #cleanup() {
    let changed = false;
    for (const [k, v] of this.Queries) {
      if (v.canRemove()) {
        v.sendClose();
        this.Queries.delete(k);
        this.#log("Deleted query %s", k);
        changed = true;
      }
    }
    if (changed) {
      this.notifyChange();
    }
    setTimeout(() => this.#cleanup(), 1_000);
  }
}
