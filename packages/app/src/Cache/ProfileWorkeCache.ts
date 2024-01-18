import { CachedTable, CacheEvents, removeUndefined } from "@snort/shared";
import { CachedMetadata, mapEventToProfile, NostrEvent } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import EventEmitter from "eventemitter3";

export class ProfileCacheRelayWorker extends EventEmitter<CacheEvents> implements CachedTable<CachedMetadata> {
  #relay: WorkerRelayInterface;
  #keys = new Set<string>();
  #cache = new Map<string, CachedMetadata>();

  constructor(relay: WorkerRelayInterface) {
    super();
    this.#relay = relay;
  }

  async preload() {
    const ids = await this.#relay.sql("select distinct(pubkey) from events where kind = ?", [0]);
    this.#keys = new Set<string>(ids.map(a => a[0] as string));
  }

  keysOnTable(): string[] {
    return [...this.#keys];
  }

  getFromCache(key?: string | undefined) {
    if (key) {
      return this.#cache.get(key);
    }
  }

  discover(ev: NostrEvent) {
    if (ev.kind === 0) {
      this.#keys.add(ev.pubkey);
    }
  }

  async get(key?: string | undefined) {
    if (key) {
      const cached = this.getFromCache(key);
      if (cached) {
        return cached;
      }
      const res = await this.bulkGet([key]);
      if (res.length > 0) {
        return res[0];
      }
    }
  }

  async bulkGet(keys: string[]) {
    if (keys.length === 0) return [];

    const results = await this.#relay.req({
      id: "ProfileCacheRelayWorker.bulkGet",
      filters: [
        {
          authors: keys,
          kinds: [0],
        },
      ],
    });
    const mapped = removeUndefined(results.result.map(a => mapEventToProfile(a)));
    for (const pf of mapped) {
      this.#cache.set(this.key(pf), pf);
    }
    this.emit(
      "change",
      mapped.map(a => this.key(a)),
    );
    console.debug("ProfileCacheRelayWorker", keys, results);
    return mapped;
  }

  async set(obj: CachedMetadata) {
    this.#keys.add(this.key(obj));
  }

  async bulkSet(obj: CachedMetadata[] | readonly CachedMetadata[]) {
    const mapped = obj.map(a => this.key(a));
    mapped.forEach(a => this.#keys.add(a));
    this.emit("change", mapped);
  }

  async update<TWithCreated extends CachedMetadata & { created: number; loaded: number }>(
    m: TWithCreated,
  ): Promise<"new" | "refresh" | "updated" | "no_change"> {
    // do nothing
    return "refresh";
  }

  async buffer(keys: string[]) {
    const missing = keys.filter(a => !this.#cache.has(a));
    const res = await this.bulkGet(missing);
    return missing.filter(a => !res.some(b => this.key(b) === a));
  }

  key(of: CachedMetadata) {
    return of.pubkey;
  }

  snapshot() {
    return [...this.#cache.values()];
  }
}
