import { CachedTable } from "@snort/shared";
import { CachedMetadata, UsersFollows } from "./cache";
import { CacheRelay } from "./cache-relay";
import { UserFollowsCache } from "./cache/user-follows-lists";
import { UserRelaysCache, UserProfileCache } from "./index";
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
      relays: props.relays ?? new UserRelaysCache(),
      profiles: props.profiles ?? new UserProfileCache(),
      contactLists: props.contactLists ?? new UserFollowsCache(),
      optimizer: props.optimizer ?? DefaultOptimizer,
      checkSigs: props.checkSigs ?? false,
      cachingRelay: props.cachingRelay,
      automaticOutboxModel: props.automaticOutboxModel ?? true,
      buildFollowGraph: props.buildFollowGraph ?? false,
      fallbackSync: props.fallbackSync ?? "since",
      socialGraphInstance: props.socialGraphInstance ?? new SocialGraph("00".repeat(32)),
      disableSyncModule: props.disableSyncModule ?? false,
    };
  }

  /**
   * Storage class for user profiles
   */
  get profileCache(): CachedTable<CachedMetadata> {
    return this.#config.profiles;
  }

  /**
   * Optimizer instance, contains optimized functions for processing data
   */
  get optimizer(): Optimizer {
    return this.#config.optimizer;
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
