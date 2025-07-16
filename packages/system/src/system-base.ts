import { CachedTable } from "@snort/shared";
import { UsersRelays, CachedMetadata, RelayMetrics, UsersFollows } from "./cache";
import { CacheRelay } from "./cache-relay";
import { EventsCache } from "./cache/events";
import { UserFollowsCache } from "./cache/user-follows-lists";
import { UserRelaysCache, UserProfileCache, RelayMetricCache, NostrEvent } from "./index";
import { DefaultOptimizer, Optimizer } from "./query-optimizer";
import { NostrSystemEvents, SystemConfig } from "./system";
import { EventEmitter } from "eventemitter3";
import { SocialGraph } from "nostr-social-graph";

export abstract class SystemBase extends EventEmitter<NostrSystemEvents> {
  #config: SystemConfig;

  get config() {
    return this.#config;
  }

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
      fallbackSync: props.fallbackSync ?? "since",
      socialGraphInstance: props.socialGraphInstance ?? new SocialGraph("00".repeat(32)),
    };
  }

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
}
