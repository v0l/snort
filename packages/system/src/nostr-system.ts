import debug from "debug";

import { unwrap, sanitizeRelayUrl, ExternalStore, FeedCache, removeUndefined } from "@snort/shared";
import { NostrEvent, TaggedNostrEvent } from "./nostr";
import { AuthHandler, Connection, RelaySettings, ConnectionStateSnapshot, OkResponse } from "./connection";
import { Query } from "./query";
import { NoteCollection, NoteStore, NoteStoreSnapshotData } from "./note-collection";
import { BuiltRawReqFilter, RequestBuilder, RequestStrategy } from "./request-builder";
import { RelayMetricHandler } from "./relay-metric-handler";
import {
  MetadataCache,
  ProfileLoaderService,
  RelayMetrics,
  SystemInterface,
  SystemSnapshot,
  UserProfileCache,
  UserRelaysCache,
  RelayMetricCache,
  UsersRelays,
  SnortSystemDb,
} from ".";
import { EventsCache } from "./cache/events";
import { RelayCache } from "./gossip-model";
import { QueryOptimizer, DefaultQueryOptimizer } from "./query-optimizer";
import { trimFilters } from "./request-trim";

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
  #relayCache: FeedCache<UsersRelays>;

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

  /**
   * General events cache
   */
  #eventsCache: FeedCache<NostrEvent>;

  /**
   * Query optimizer instance
   */
  #queryOptimizer: QueryOptimizer;

  constructor(props: {
    authHandler?: AuthHandler;
    relayCache?: FeedCache<UsersRelays>;
    profileCache?: FeedCache<MetadataCache>;
    relayMetrics?: FeedCache<RelayMetrics>;
    eventsCache?: FeedCache<NostrEvent>;
    queryOptimizer?: QueryOptimizer;
    db?: SnortSystemDb;
  }) {
    super();
    this.#handleAuth = props.authHandler;
    this.#relayCache = props.relayCache ?? new UserRelaysCache(props.db?.userRelays);
    this.#profileCache = props.profileCache ?? new UserProfileCache(props.db?.users);
    this.#relayMetricsCache = props.relayMetrics ?? new RelayMetricCache(props.db?.relayMetrics);
    this.#eventsCache = props.eventsCache ?? new EventsCache(props.db?.events);
    this.#queryOptimizer = props.queryOptimizer ?? DefaultQueryOptimizer;

    this.#profileLoader = new ProfileLoaderService(this, this.#profileCache);
    this.#relayMetrics = new RelayMetricHandler(this.#relayMetricsCache);
    this.#cleanup();
  }

  HandleAuth?: AuthHandler | undefined;

  get ProfileLoader() {
    return this.#profileLoader;
  }

  get Sockets(): ConnectionStateSnapshot[] {
    return [...this.#sockets.values()].map(a => a.snapshot());
  }

  get RelayCache(): RelayCache {
    return this.#relayCache;
  }

  get QueryOptimizer(): QueryOptimizer {
    return this.#queryOptimizer;
  }

  /**
   * Setup caches
   */
  async Init() {
    const t = [
      this.#relayCache.preload(),
      this.#profileCache.preload(),
      this.#relayMetricsCache.preload(),
      this.#eventsCache.preload(),
    ];
    await Promise.all(t);
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
        c.OnEvent = (s, e) => this.#onEvent(s, e);
        c.OnEose = s => this.#onEndOfStoredEvents(c, s);
        c.OnDisconnect = code => this.#onRelayDisconnect(c, code);
        c.OnConnected = r => this.#onRelayConnected(c, r);
        await c.Connect();
      } else {
        // update settings if already connected
        unwrap(this.#sockets.get(addr)).Settings = options;
      }
    } catch (e) {
      console.error(e);
    }
  }

  #onRelayConnected(c: Connection, wasReconnect: boolean) {
    if (wasReconnect) {
      for (const [, q] of this.Queries) {
        q.connectionRestored(c);
      }
    }
  }

  #onRelayDisconnect(c: Connection, code: number) {
    this.#relayMetrics.onDisconnect(c, code);
    for (const [, q] of this.Queries) {
      q.connectionLost(c.Id);
    }
  }

  #onEndOfStoredEvents(c: Readonly<Connection>, sub: string) {
    for (const [, v] of this.Queries) {
      v.eose(sub, c);
    }
  }

  #onEvent(sub: string, ev: TaggedNostrEvent) {
    for (const [, v] of this.Queries) {
      v.handleEvent(sub, ev);
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
        const c = new Connection(addr, { read: true, write: true }, this.#handleAuth?.bind(this), true);
        this.#sockets.set(addr, c);
        c.OnEvent = (s, e) => this.#onEvent(s, e);
        c.OnEose = s => this.#onEndOfStoredEvents(c, s);
        c.OnDisconnect = code => this.#onRelayDisconnect(c, code);
        c.OnConnected = r => this.#onRelayConnected(c, r);
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

  Fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) {
    const q = this.Query(NoteCollection, req);
    return new Promise<NoteStoreSnapshotData>(resolve => {
      let t: ReturnType<typeof setTimeout> | undefined;
      let tBuf: Array<TaggedNostrEvent> = [];
      const releaseOnEvent = cb
        ? q.feed.onEvent(evs => {
            if (!t) {
              tBuf = [...evs];
              t = setTimeout(() => {
                t = undefined;
                cb(tBuf);
              }, 100);
            } else {
              tBuf.push(...evs);
            }
          })
        : undefined;
      const releaseFeedHook = q.feed.hook(() => {
        if (q.progress === 1) {
          releaseOnEvent?.();
          releaseFeedHook();
          q.cancel();
          resolve(unwrap(q.feed.snapshot.data));
        }
      });
    });
  }

  Query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder): Query {
    const existing = this.Queries.get(req.id);
    if (existing) {
      // if same instance, just return query
      if (existing.fromInstance === req.instance) {
        return existing;
      }
      const filters = !req.options?.skipDiff ? req.buildDiff(this, existing.filters) : req.build(this);
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

      const filters = req.build(this);
      const q = new Query(req.id, req.instance, store, req.options?.leaveOpen);
      if (filters.some(a => a.filters.some(b => b.ids))) {
        const expectIds = new Set(filters.flatMap(a => a.filters).flatMap(a => a.ids ?? []));
        q.feed.onEvent(async evs => {
          const toSet = evs.filter(a => expectIds.has(a.id) && this.#eventsCache.getFromCache(a.id) === undefined);
          if (toSet.length > 0) {
            await this.#eventsCache.bulkSet(toSet);
          }
        });
      }
      this.Queries.set(req.id, q);
      for (const subQ of filters) {
        this.SendQuery(q, subQ);
      }
      this.notifyChange();
      return q;
    }
  }

  async SendQuery(q: Query, qSend: BuiltRawReqFilter) {
    // trim query of cached ids
    for (const f of qSend.filters) {
      if (f.ids) {
        const cacheResults = await this.#eventsCache.bulkGet(f.ids);
        if (cacheResults.length > 0) {
          const resultIds = new Set(cacheResults.map(a => a.id));
          f.ids = f.ids.filter(a => !resultIds.has(a));
          q.insertCompletedTrace(
            {
              filters: [{ ...f, ids: [...resultIds] }],
              strategy: RequestStrategy.ExplicitRelays,
              relay: qSend.relay,
            },
            cacheResults as Array<TaggedNostrEvent>,
          );
        }
      }
    }

    // check for empty filters
    const fNew = trimFilters(qSend.filters);
    if (fNew.length === 0) {
      return;
    }
    qSend.filters = fNew;

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
  async BroadcastEvent(ev: NostrEvent, cb?: (rsp: OkResponse) => void) {
    const socks = [...this.#sockets.values()].filter(a => !a.Ephemeral && a.Settings.write);
    const oks = await Promise.all(
      socks.map(async s => {
        try {
          const rsp = await s.SendAsync(ev);
          cb?.(rsp);
          return rsp;
        } catch (e) {
          console.error(e);
        }
        return;
      }),
    );
    return removeUndefined(oks);
  }

  /**
   * Write an event to a relay then disconnect
   */
  async WriteOnceToRelay(address: string, ev: NostrEvent): Promise<OkResponse> {
    const addrClean = sanitizeRelayUrl(address);
    if (!addrClean) {
      throw new Error("Invalid relay address");
    }

    const existing = this.#sockets.get(addrClean);
    if (existing) {
      return await existing.SendAsync(ev);
    } else {
      return await new Promise<OkResponse>((resolve, reject) => {
        const c = new Connection(address, { write: true, read: true }, this.#handleAuth?.bind(this), true);

        const t = setTimeout(reject, 10_000);
        c.OnConnected = async () => {
          clearTimeout(t);
          const rsp = await c.SendAsync(ev);
          c.Close();
          resolve(rsp);
        };
        c.Connect();
      });
    }
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
