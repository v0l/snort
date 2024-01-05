import debug from "debug";
import EventEmitter from "eventemitter3";

import { unwrap, FeedCache } from "@snort/shared";
import { NostrEvent, ReqFilter, TaggedNostrEvent } from "./nostr";
import { RelaySettings, ConnectionStateSnapshot, OkResponse } from "./connection";
import { Query } from "./query";
import { NoteCollection, NoteStore } from "./note-collection";
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
  EventExt,
} from ".";
import { EventsCache } from "./cache/events";
import { RelayCache, RelayMetadataLoader } from "./outbox-model";
import { Optimizer, DefaultOptimizer } from "./query-optimizer";
import { trimFilters } from "./request-trim";
import { NostrConnectionPool } from "./nostr-connection-pool";
import inMemoryDB from "./InMemoryDB";

export interface NostrSystemEvents {
  change: (state: SystemSnapshot) => void;
  auth: (challenge: string, relay: string, cb: (ev: NostrEvent) => void) => void;
  event: (subId: string, ev: TaggedNostrEvent) => void;
  request: (filter: ReqFilter) => void;
}

export interface NostrsystemProps {
  relayCache?: FeedCache<UsersRelays>;
  profileCache?: FeedCache<MetadataCache>;
  relayMetrics?: FeedCache<RelayMetrics>;
  eventsCache?: FeedCache<NostrEvent>;
  optimizer?: Optimizer;
  db?: SnortSystemDb;
  checkSigs?: boolean;
}

/**
 * Manages nostr content retrieval system
 */
export class NostrSystem extends EventEmitter<NostrSystemEvents> implements SystemInterface {
  #log = debug("System");
  #pool = new NostrConnectionPool();

  /**
   * All active queries
   */
  Queries: Map<string, Query> = new Map();

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
   * Optimizer instance, contains optimized functions for processing data
   */
  #optimizer: Optimizer;

  /**
   * Check event signatures (reccomended)
   */
  checkSigs: boolean;

  #relayLoader: RelayMetadataLoader;

  constructor(props: NostrsystemProps) {
    super();
    this.#relayCache = props.relayCache ?? new UserRelaysCache(props.db?.userRelays);
    this.#profileCache = props.profileCache ?? new UserProfileCache(props.db?.users);
    this.#relayMetricsCache = props.relayMetrics ?? new RelayMetricCache(props.db?.relayMetrics);
    this.#eventsCache = props.eventsCache ?? new EventsCache(props.db?.events);
    this.#optimizer = props.optimizer ?? DefaultOptimizer;

    this.#profileLoader = new ProfileLoaderService(this, this.#profileCache);
    this.#relayMetrics = new RelayMetricHandler(this.#relayMetricsCache);
    this.#relayLoader = new RelayMetadataLoader(this, this.#relayCache);
    this.checkSigs = props.checkSigs ?? true;
    this.#cleanup();

    // hook connection pool
    this.#pool.on("connected", (id, wasReconnect) => {
      const c = this.#pool.getConnection(id);
      if (c) {
        this.#relayMetrics.onConnect(c.Address);
        if (wasReconnect) {
          for (const [, q] of this.Queries) {
            q.connectionRestored(c);
          }
        }
      }
    });
    this.#pool.on("connectFailed", address => {
      this.#relayMetrics.onDisconnect(address, 0);
    });
    this.#pool.on("event", (_, sub, ev) => {
      ev.relays?.length && this.#relayMetrics.onEvent(ev.relays[0]);

      if (!EventExt.isValid(ev)) {
        this.#log("Rejecting invalid event %O", ev);
        return;
      }
      if (this.checkSigs) {
        if (!this.#optimizer.schnorrVerify(ev)) {
          this.#log("Invalid sig %O", ev);
          return;
        }
      }

      this.emit("event", sub, ev);
    });
    this.#pool.on("disconnect", (id, code) => {
      const c = this.#pool.getConnection(id);
      if (c) {
        this.#relayMetrics.onDisconnect(c.Address, code);
        for (const [, q] of this.Queries) {
          q.connectionLost(c.Id);
        }
      }
    });
    this.#pool.on("eose", (id, sub) => {
      const c = this.#pool.getConnection(id);
      if (c) {
        for (const [, v] of this.Queries) {
          v.eose(sub, c);
        }
      }
    });
    this.#pool.on("auth", (_, c, r, cb) => this.emit("auth", c, r, cb));
    this.#pool.on("notice", (addr, msg) => {
      this.#log("NOTICE: %s %s", addr, msg);
    });

    // internal handler for on-event
    this.on("event", (sub, ev) => {
      inMemoryDB.handleEvent(ev);
      for (const [, v] of this.Queries) {
        v.handleEvent(sub, ev);
      }
    });
  }

  get ProfileLoader() {
    return this.#profileLoader;
  }

  get Sockets(): ConnectionStateSnapshot[] {
    return this.#pool.getState();
  }

  get RelayCache(): RelayCache {
    return this.#relayCache;
  }

  get Optimizer(): Optimizer {
    return this.#optimizer;
  }

  async Init() {
    const t = [
      this.#relayCache.preload(),
      this.#profileCache.preload(),
      this.#relayMetricsCache.preload(),
      this.#eventsCache.preload(),
    ];
    await Promise.all(t);
  }

  async ConnectToRelay(address: string, options: RelaySettings) {
    await this.#pool.connect(address, options, false);
  }

  ConnectEphemeralRelay(address: string) {
    return this.#pool.connect(address, { read: true, write: true }, true);
  }

  DisconnectRelay(address: string) {
    this.#pool.disconnect(address);
  }

  GetQuery(id: string): Query | undefined {
    return this.Queries.get(id);
  }

  Fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) {
    const q = this.Query(NoteCollection, req);
    return new Promise<Array<TaggedNostrEvent>>(resolve => {
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
          resolve(unwrap((q.feed as NoteCollection).snapshot.data));
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
      const q = new Query(req.id, req.instance, store, req.options?.leaveOpen, req.options?.timeout);
      q.on("trace", r => this.#relayMetrics.onTraceReport(r));

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
      if (f.authors) {
        this.#relayLoader.TrackKeys(f.authors);
      }
    }

    // check for empty filters
    const fNew = trimFilters(qSend.filters);
    if (fNew.length === 0) {
      return;
    }
    qSend.filters = fNew;

    fNew.forEach(f => {
      const alreadyHave = inMemoryDB.findArray(f).map(e => {
        console.log("got from inMemoryDB", e);
        this.HandleEvent(e);
        return e.id;
      });
      let fCopy = { ...f }; // some relays reject the query if it contains an unknown key. only send locally.
      if (alreadyHave.length) {
        fCopy.not = fCopy.not ?? {};
        if (fCopy.not.ids) {
          fCopy.not.ids.push(...alreadyHave);
        } else {
          fCopy.not.ids = alreadyHave;
        }
      }
      this.emit("request", fCopy);
    });

    if (qSend.relay) {
      this.#log("Sending query to %s %O", qSend.relay, qSend);
      const s = this.#pool.getConnection(qSend.relay);
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
      for (const [a, s] of this.#pool) {
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

  HandleEvent(ev: TaggedNostrEvent) {
    this.emit("event", "*", ev);
  }

  async BroadcastEvent(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]> {
    this.HandleEvent({ ...ev, relays: [] });
    return await this.#pool.broadcast(this, ev, cb);
  }

  async WriteOnceToRelay(address: string, ev: NostrEvent): Promise<OkResponse> {
    return await this.#pool.broadcastTo(address, ev);
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

  notifyChange() {
    this.emit("change", this.takeSnapshot());
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
