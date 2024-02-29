import debug from "debug";
import EventEmitter from "eventemitter3";

import { CachedTable, isHex, unixNowMs } from "@snort/shared";
import { NostrEvent, TaggedNostrEvent, OkResponse } from "./nostr";
import { Connection, RelaySettings } from "./connection";
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
  QueryLike,
  OutboxModel,
  socialGraphInstance,
  EventKind,
  UsersFollows,
  ID,
} from ".";
import { EventsCache } from "./cache/events";
import { RelayMetadataLoader } from "./outbox";
import { Optimizer, DefaultOptimizer } from "./query-optimizer";
import { ConnectionPool, DefaultConnectionPool } from "./connection-pool";
import { QueryManager } from "./query-manager";
import { CacheRelay } from "./cache-relay";
import { RequestRouter } from "./request-router";
import { UserFollowsCache } from "./cache/user-follows-lists";

export interface NostrSystemEvents {
  change: (state: SystemSnapshot) => void;
  auth: (challenge: string, relay: string, cb: (ev: NostrEvent) => void) => void;
  event: (subId: string, ev: TaggedNostrEvent) => void;
  request: (subId: string, filter: BuiltRawReqFilter) => void;
}

export interface SystemConfig {
  /**
   * Users configured relays (via kind 3 or kind 10_002)
   */
  relays: CachedTable<UsersRelays>;

  /**
   * Cache of user profiles, (kind 0)
   */
  profiles: CachedTable<CachedMetadata>;

  /**
   * Cache of relay connection stats
   */
  relayMetrics: CachedTable<RelayMetrics>;

  /**
   * Direct reference events cache
   */
  events: CachedTable<NostrEvent>;

  /**
   * Cache of user ContactLists (kind 3)
   */
  contactLists: CachedTable<UsersFollows>;

  /**
   * Optimized cache relay, usually `@snort/worker-relay`
   */
  cachingRelay?: CacheRelay;

  /**
   * Optimized functions, usually `@snort/system-wasm`
   */
  optimizer: Optimizer;

  /**
   * Dexie database storage, usually `@snort/system-web`
   */
  db?: SnortSystemDb;

  /**
   * Check event sigs on receive from relays
   */
  checkSigs: boolean;

  /**
   * Automatically handle outbox model
   *
   * 1. Fetch relay lists automatically for queried authors
   * 2. Write to inbox for all `p` tagged users in broadcasting events
   */
  automaticOutboxModel: boolean;

  /**
   * Automatically populate SocialGraph from kind 3 events fetched.
   *
   * This is basically free because we always load relays (which includes kind 3 contact lists)
   * for users when fetching by author.
   */
  buildFollowGraph: boolean;
}

/**
 * Manages nostr content retrieval system
 */
export class NostrSystem extends EventEmitter<NostrSystemEvents> implements SystemInterface {
  #log = debug("System");
  #queryManager: QueryManager;
  #config: SystemConfig;

  /**
   * Storage class for user relay lists
   */
  get relayCache(): CachedTable<UsersRelays> {
    return this.#config.relays;
  }

  /**
   * Storage class for user profiles
   */
  get profileCache(): CachedTable<CachedMetadata> {
    return this.#config.profiles;
  }

  /**
   * Storage class for relay metrics (connects/disconnects)
   */
  get relayMetricsCache(): CachedTable<RelayMetrics> {
    return this.#config.relayMetrics;
  }

  /**
   * Optimizer instance, contains optimized functions for processing data
   */
  get optimizer(): Optimizer {
    return this.#config.optimizer;
  }

  get eventsCache(): CachedTable<NostrEvent> {
    return this.#config.events;
  }

  get userFollowsCache(): CachedTable<UsersFollows> {
    return this.#config.contactLists;
  }

  get cacheRelay(): CacheRelay | undefined {
    return this.#config.cachingRelay;
  }

  /**
   * Check event signatures (recommended)
   */
  get checkSigs(): boolean {
    return this.#config.checkSigs;
  }

  set checkSigs(v: boolean) {
    this.#config.checkSigs = v;
  }

  readonly profileLoader: ProfileLoaderService;
  readonly relayMetricsHandler: RelayMetricHandler;
  readonly pool: ConnectionPool;
  readonly relayLoader: RelayMetadataLoader;
  readonly requestRouter: RequestRouter | undefined;

  constructor(props: Partial<SystemConfig>) {
    super();
    this.#config = {
      relays: props.relays ?? new UserRelaysCache(props.db?.userRelays),
      profiles: props.profiles ?? new UserProfileCache(props.db?.users),
      relayMetrics: props.relayMetrics ?? new RelayMetricCache(props.db?.relayMetrics),
      events: props.events ?? new EventsCache(props.db?.events),
      contactLists: props.contactLists ?? new UserFollowsCache(props.db?.contacts),
      optimizer: props.optimizer ?? DefaultOptimizer,
      checkSigs: props.checkSigs ?? false,
      cachingRelay: props.cachingRelay,
      db: props.db,
      automaticOutboxModel: props.automaticOutboxModel ?? true,
      buildFollowGraph: props.buildFollowGraph ?? false,
    };

    this.profileLoader = new ProfileLoaderService(this, this.profileCache);
    this.relayMetricsHandler = new RelayMetricHandler(this.relayMetricsCache);
    this.relayLoader = new RelayMetadataLoader(this, this.relayCache);

    // if automatic outbox model, setup request router as OutboxModel
    if (this.#config.automaticOutboxModel) {
      this.requestRouter = OutboxModel.fromSystem(this);
    }

    // Hook on-event when building follow graph
    if (this.#config.buildFollowGraph) {
      let evBuf: Array<TaggedNostrEvent> = [];
      let t: ReturnType<typeof setTimeout> | undefined;
      this.on("event", (_, ev) => {
        if (ev.kind === EventKind.ContactList) {
          // fire&forget update
          this.userFollowsCache.update({
            loaded: unixNowMs(),
            created: ev.created_at,
            pubkey: ev.pubkey,
            follows: ev.tags,
          });

          // buffer social graph updates into 500ms window
          evBuf.push(ev);
          if (!t) {
            t = setTimeout(() => {
              socialGraphInstance.handleEvent(evBuf);
              evBuf = [];
            }, 500);
          }
        }
      });
    }

    this.pool = new DefaultConnectionPool(this);
    this.#queryManager = new QueryManager(this);

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
    this.#queryManager.on("request", (subId: string, f: BuiltRawReqFilter) => this.emit("request", subId, f));
  }

  async Init(follows?: Array<string>) {
    const t = [
      this.relayCache.preload(follows),
      this.profileCache.preload(follows),
      this.relayMetricsCache.preload(follows),
      this.eventsCache.preload(follows),
      this.userFollowsCache.preload(follows),
    ];
    await Promise.all(t);
    await this.PreloadSocialGraph();
  }

  async PreloadSocialGraph() {
    // Insert data to socialGraph from cache
    if (this.#config.buildFollowGraph) {
      for (const list of this.userFollowsCache.snapshot()) {
        const user = ID(list.pubkey);
        for (const fx of list.follows) {
          if (fx[0] === "p" && fx[1]?.length === 64) {
            socialGraphInstance.addFollower(ID(fx[1]), user);
          }
        }
      }
    }
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
    return this.#queryManager.get(id);
  }

  Fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) {
    return this.#queryManager.fetch(req, cb);
  }

  Query(req: RequestBuilder): QueryLike {
    return this.#queryManager.query(req);
  }

  HandleEvent(subId: string, ev: TaggedNostrEvent) {
    this.emit("event", subId, ev);
    this.#queryManager.handleEvent(ev);
  }

  async BroadcastEvent(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]> {
    this.HandleEvent("*", { ...ev, relays: [] });
    return await this.pool.broadcast(ev, cb);
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
