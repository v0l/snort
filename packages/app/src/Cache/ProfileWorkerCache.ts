import { CachedTable, CacheEvents, removeUndefined, unixNowMs } from "@snort/shared";
import { CachedMetadata, CacheRelay, mapEventToProfile, NostrEvent } from "@snort/system";
import debug from "debug";
import { EventEmitter } from "eventemitter3";

export class ProfileCacheRelayWorker
  extends EventEmitter<CacheEvents<CachedMetadata>>
  implements CachedTable<CachedMetadata>
{
  #relay: CacheRelay;
  #keys = new Set<string>();
  #cache = new Map<string, CachedMetadata>();
  #log = debug("ProfileCacheRelayWorker");

  constructor(relay: CacheRelay) {
    super();
    this.#relay = relay;
  }

  async preload() {
    const start = unixNowMs();
    const profiles = await this.#relay.query([
      "REQ",
      "profiles-preload",
      {
        kinds: [0],
      },
    ]);
    const profilesMapped = removeUndefined(profiles.map(a => mapEventToProfile(a)));
    this.#cache = new Map<string, CachedMetadata>(profilesMapped.map(a => [a.pubkey, a]));
    this.#keys = new Set<string>(this.#cache.keys());
    this.#log(`Loaded %d/%d in %d ms`, this.#cache.size, this.#keys.size, (unixNowMs() - start).toLocaleString());
  }

  async search(q: string) {
    const profiles = await this.#relay.query([
      "REQ",
      "profiles-search",
      {
        kinds: [0],
        search: q,
      },
    ]);
    return removeUndefined(profiles.map(mapEventToProfile));
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

    const results = await this.#relay.query([
      "REQ",
      "ProfileCacheRelayWorker.bulkGet",
      {
        authors: keys,
        kinds: [0],
      },
    ]);
    const mapped = removeUndefined(results.map(a => mapEventToProfile(a)));
    for (const pf of mapped) {
      this.set(pf);
    }
    this.emit(
      "change",
      mapped.map(a => this.key(a)),
    );
    return mapped;
  }

  async set(obj: CachedMetadata) {
    const cached = this.getFromCache(this.key(obj));
    if (cached?.loaded && cached?.loaded >= obj.loaded) {
      return; //skip if newer is in cache
    }

    const k = this.key(obj);
    this.#keys.add(k);
    this.#cache.set(k, obj);
    console.debug("SET PROFILE", obj);
  }

  async bulkSet(obj: CachedMetadata[] | readonly CachedMetadata[]) {
    obj.forEach(a => this.set(a));
    this.emit(
      "change",
      obj.map(a => a.pubkey),
    );
  }

  async update(obj: CachedMetadata): Promise<"new" | "refresh" | "updated" | "no_change"> {
    // do nothing
    await this.set(obj);
    this.emit("change", [obj.pubkey]);
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
