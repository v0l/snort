import debug from "debug";
import EventEmitter from "eventemitter3";

import { FeedCache } from "@snort/shared";
import { NostrEvent, ReqFilter, TaggedNostrEvent } from "./nostr";
import { RelaySettings, ConnectionStateSnapshot, OkResponse } from "./connection";
import { Query } from "./query";
import { NoteStore } from "./note-collection";
import { BuiltRawReqFilter, RequestBuilder } from "./request-builder";
import { RelayMetricHandler } from "./relay-metric-handler";
import {
  CachedMetadata,
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
  QueryLike,
} from ".";
import { EventsCache } from "./cache/events";
import { RelayCache, RelayMetadataLoader } from "./outbox-model";
import { Optimizer, DefaultOptimizer } from "./query-optimizer";
import { trimFilters } from "./request-trim";
import { NostrConnectionPool } from "./nostr-connection-pool";
import { NostrQueryManager } from "./nostr-query-manager";
import { FilterCacheLayer, IdsFilterCacheLayer } from "./filter-cache-layer";

export interface NostrSystemEvents {
  change: (state: SystemSnapshot) => void;
  auth: (challenge: string, relay: string, cb: (ev: NostrEvent) => void) => void;
  event: (subId: string, ev: TaggedNostrEvent) => void;
  request: (filter: ReqFilter) => void;
}

export interface NostrsystemProps {
  relayCache?: FeedCache<UsersRelays>;
  profileCache?: FeedCache<CachedMetadata>;
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
  #queryManager: NostrQueryManager;

  /**
   * Storage class for user relay lists
   */
  #relayCache: FeedCache<UsersRelays>;

  /**
   * Storage class for user profiles
   */
  #profileCache: FeedCache<CachedMetadata>;

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

  /**
   * Query cache processing layers which can take data from a cache
   */
  #queryCacheLayers: Array<FilterCacheLayer> = [];

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

    this.#queryManager = new NostrQueryManager(this);
    this.#queryCacheLayers.push(new IdsFilterCacheLayer(this.#eventsCache));

    // hook connection pool
    this.#pool.on("connected", (id, wasReconnect) => {
      const c = this.#pool.getConnection(id);
      if (c) {
        this.#relayMetrics.onConnect(c.Address);
        if (wasReconnect) {
          for (const [, q] of this.#queryManager) {
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
        for (const [, q] of this.#queryManager) {
          q.connectionLost(c.Id);
        }
      }
    });
    this.#pool.on("eose", (id, sub) => {
      const c = this.#pool.getConnection(id);
      if (c) {
        for (const [, v] of this.#queryManager) {
          v.eose(sub, c);
        }
      }
    });
    this.#pool.on("auth", (_, c, r, cb) => this.emit("auth", c, r, cb));
    this.#pool.on("notice", (addr, msg) => {
      this.#log("NOTICE: %s %s", addr, msg);
    });
    this.#queryManager.on("change", () => this.emit("change", this.takeSnapshot()));
    this.#queryManager.on("sendQuery", (q, f) => this.#sendQuery(q, f));
    this.#queryManager.on("trace", t => {
      this.#relayMetrics.onTraceReport(t);
    });

    // internal handler for on-event
    this.on("event", (sub, ev) => {
      for (const [, v] of this.#queryManager) {
        const trace = v.handleEvent(sub, ev);
        if (trace && trace.filters.some(a => a.ids)) {
          this.#eventsCache.set(ev);
        }
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

  get UserProfileCache(): FeedCache<CachedMetadata> {
    return this.#profileCache;
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

  GetQuery(id: string): QueryLike | undefined {
    return this.#queryManager.get(id) as QueryLike;
  }

  Fetch(req: RequestBuilder, cb?: (evs: ReadonlyArray<TaggedNostrEvent>) => void) {
    return this.#queryManager.fetch(req, cb);
  }

  Query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder): QueryLike {
    return this.#queryManager.query(type, req) as QueryLike;
  }

  async #sendQuery(q: Query, qSend: BuiltRawReqFilter) {
    for (const qfl of this.#queryCacheLayers) {
      qSend = await qfl.processFilter(q, qSend);
    }
    for (const f of qSend.filters) {
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
      queries: [...this.#queryManager].map(([, a]) => {
        return {
          id: a.id,
          filters: a.filters,
          subFilters: [],
        };
      }),
    };
  }
}
