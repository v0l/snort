import debug from "debug";
import EventEmitter from "eventemitter3";

import { FeedCache } from "@snort/shared";
import { NostrEvent, ReqFilter, TaggedNostrEvent } from "./nostr";
import { RelaySettings, ConnectionStateSnapshot, OkResponse } from "./connection";
import { RequestBuilder } from "./request-builder";
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
import { RelayMetadataLoader } from "./outbox-model";
import { Optimizer, DefaultOptimizer } from "./query-optimizer";
import { NostrConnectionPool } from "./nostr-connection-pool";
import { NostrQueryManager } from "./nostr-query-manager";

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
  #queryManager: NostrQueryManager;

  /**
   * Storage class for user relay lists
   */
  readonly relayCache: FeedCache<UsersRelays>;

  /**
   * Storage class for user profiles
   */
  readonly profileCache: FeedCache<CachedMetadata>;

  /**
   * Storage class for relay metrics (connects/disconnects)
   */
  readonly relayMetricsCache: FeedCache<RelayMetrics>;

  /**
   * Profile loading service
   */
  readonly profileLoader: ProfileLoaderService;

  /**
   * Relay metrics handler cache
   */
  readonly relayMetricsHandler: RelayMetricHandler;

  /**
   * Optimizer instance, contains optimized functions for processing data
   */
  readonly optimizer: Optimizer;

  readonly pool = new NostrConnectionPool();
  readonly eventsCache: FeedCache<NostrEvent>;
  readonly relayLoader: RelayMetadataLoader;

  /**
   * Check event signatures (reccomended)
   */
  checkSigs: boolean;

  constructor(props: NostrsystemProps) {
    super();
    this.relayCache = props.relayCache ?? new UserRelaysCache(props.db?.userRelays);
    this.profileCache = props.profileCache ?? new UserProfileCache(props.db?.users);
    this.relayMetricsCache = props.relayMetrics ?? new RelayMetricCache(props.db?.relayMetrics);
    this.eventsCache = props.eventsCache ?? new EventsCache(props.db?.events);
    this.optimizer = props.optimizer ?? DefaultOptimizer;

    this.profileLoader = new ProfileLoaderService(this, this.profileCache);
    this.relayMetricsHandler = new RelayMetricHandler(this.relayMetricsCache);
    this.relayLoader = new RelayMetadataLoader(this, this.relayCache);
    this.checkSigs = props.checkSigs ?? true;

    this.#queryManager = new NostrQueryManager(this);

    // hook connection pool
    this.pool.on("connected", (id, wasReconnect) => {
      const c = this.pool.getConnection(id);
      if (c) {
        this.relayMetricsHandler.onConnect(c.Address);
        if (wasReconnect) {
          for (const [, q] of this.#queryManager) {
            q.connectionRestored(c);
          }
        }
      }
    });
    this.pool.on("connectFailed", address => {
      this.relayMetricsHandler.onDisconnect(address, 0);
    });
    this.pool.on("event", (_, sub, ev) => {
      ev.relays?.length && this.relayMetricsHandler.onEvent(ev.relays[0]);

      if (!EventExt.isValid(ev)) {
        this.#log("Rejecting invalid event %O", ev);
        return;
      }
      if (this.checkSigs) {
        if (!this.optimizer.schnorrVerify(ev)) {
          this.#log("Invalid sig %O", ev);
          return;
        }
      }

      this.emit("event", sub, ev);
    });
    this.pool.on("disconnect", (id, code) => {
      const c = this.pool.getConnection(id);
      if (c) {
        this.relayMetricsHandler.onDisconnect(c.Address, code);
        for (const [, q] of this.#queryManager) {
          q.connectionLost(c.Id);
        }
      }
    });
    this.pool.on("eose", (id, sub) => {
      const c = this.pool.getConnection(id);
      if (c) {
        for (const [, v] of this.#queryManager) {
          v.eose(sub, c);
        }
      }
    });
    this.pool.on("auth", (_, c, r, cb) => this.emit("auth", c, r, cb));
    this.pool.on("notice", (addr, msg) => {
      this.#log("NOTICE: %s %s", addr, msg);
    });
    this.#queryManager.on("change", () => this.emit("change", this.takeSnapshot()));
    this.#queryManager.on("trace", t => {
      this.relayMetricsHandler.onTraceReport(t);
    });

    // internal handler for on-event
    this.on("event", (sub, ev) => {
      for (const [, v] of this.#queryManager) {
        const trace = v.handleEvent(sub, ev);
        // inject events to cache if query by id
        if (trace && trace.filters.some(a => a.ids)) {
          this.eventsCache.set(ev);
        }
      }
    });
  }

  get Sockets(): ConnectionStateSnapshot[] {
    return this.pool.getState();
  }

  async Init() {
    const t = [
      this.relayCache.preload(),
      this.profileCache.preload(),
      this.relayMetricsCache.preload(),
      this.eventsCache.preload(),
    ];
    await Promise.all(t);
  }

  async ConnectToRelay(address: string, options: RelaySettings) {
    await this.pool.connect(address, options, false);
  }

  ConnectEphemeralRelay(address: string) {
    return this.pool.connect(address, { read: true, write: true }, true);
  }

  DisconnectRelay(address: string) {
    this.pool.disconnect(address);
  }

  GetQuery(id: string): QueryLike | undefined {
    return this.#queryManager.get(id) as QueryLike;
  }

  Fetch(req: RequestBuilder, cb?: (evs: ReadonlyArray<TaggedNostrEvent>) => void) {
    return this.#queryManager.fetch(req, cb);
  }

  Query(req: RequestBuilder): QueryLike {
    return this.#queryManager.query(req) as QueryLike;
  }

  HandleEvent(ev: TaggedNostrEvent) {
    this.emit("event", "*", ev);
  }

  async BroadcastEvent(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]> {
    this.HandleEvent({ ...ev, relays: [] });
    return await this.pool.broadcast(this, ev, cb);
  }

  async WriteOnceToRelay(address: string, ev: NostrEvent): Promise<OkResponse> {
    return await this.pool.broadcastTo(address, ev);
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
