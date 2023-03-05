import { HexKey } from "@snort/nostr";
import { db } from "Db";
import { LNURL } from "LNURL";
import { unixNowMs, unwrap } from "Util";
import { MetadataCache } from ".";

type HookFn = () => void;

interface HookFilter {
  key: HexKey;
  fn: HookFn;
}

export class UserProfileCache {
  #cache: Map<HexKey, MetadataCache>;
  #hooks: Array<HookFilter>;
  #diskCache: Set<HexKey>;

  constructor() {
    this.#cache = new Map();
    this.#hooks = [];
    this.#diskCache = new Set();
    setInterval(() => {
      console.debug(
        `[UserCache] ${this.#cache.size} loaded, ${this.#diskCache.size} on-disk, ${this.#hooks.length} hooks`
      );
    }, 5_000);
  }

  async preload() {
    if (db.ready) {
      const keys = await db.users.toCollection().primaryKeys();
      this.#diskCache = new Set<HexKey>(keys.map(a => a as string));
    }
  }

  async search(q: string): Promise<Array<MetadataCache>> {
    if (db.ready) {
      // on-disk cache will always have more data
      return (
        await db.users
          .where("npub")
          .startsWithIgnoreCase(q)
          .or("name")
          .startsWithIgnoreCase(q)
          .or("display_name")
          .startsWithIgnoreCase(q)
          .or("nip05")
          .startsWithIgnoreCase(q)
          .toArray()
      ).slice(0, 5);
    } else {
      return [...this.#cache.values()]
        .filter(user => {
          const profile = user as MetadataCache;
          return (
            profile.name?.includes(q) ||
            profile.npub?.includes(q) ||
            profile.display_name?.includes(q) ||
            profile.nip05?.includes(q)
          );
        })
        .slice(0, 5);
    }
  }

  hook(fn: HookFn, key: HexKey | undefined) {
    if (!key) {
      return () => {
        //noop
      };
    }

    this.#hooks.push({
      key,
      fn,
    });
    return () => {
      const idx = this.#hooks.findIndex(a => a.fn === fn);
      if (idx >= 0) {
        this.#hooks.splice(idx, 1);
      }
    };
  }

  get(key?: HexKey) {
    if (key) {
      return this.#cache.get(key);
    }
  }

  /**
   * Try to update the profile metadata cache with a new version
   * @param m Profile metadata
   * @returns
   */
  async update(m: MetadataCache) {
    const existing = this.get(m.pubkey);
    const refresh = existing && existing.created === m.created && existing.loaded < m.loaded;
    if (!existing || existing.created < m.created || refresh) {
      this.#cache.set(m.pubkey, m);
      if (db.ready) {
        // fetch zapper key
        const lnurl = m.lud16 || m.lud06;
        if (lnurl) {
          try {
            const svc = new LNURL(lnurl);
            await svc.load();
            m.zapService = svc.zapperPubkey;
          } catch {
            console.debug("Failed to load LNURL for zapper pubkey", lnurl);
          }
          // ignored
        }
        await db.users.put(m);
        this.#diskCache.add(m.pubkey);
      }
      this.#notifyChange([m.pubkey]);
      return true;
    }
    return false;
  }

  /**
   * Loads a list of profiles from disk cache
   * @param keys List of profiles to load
   * @returns Keys that do not exist on disk cache
   */
  async buffer(keys: Array<HexKey>): Promise<Array<HexKey>> {
    const needsBuffer = keys.filter(a => !this.#cache.has(a));
    if (db.ready && needsBuffer.length > 0) {
      const mapped = needsBuffer.map(a => ({
        has: this.#diskCache.has(a),
        key: a,
      }));
      const start = unixNowMs();
      const fromCache = await db.users.bulkGet(mapped.filter(a => a.has).map(a => a.key));
      const fromCacheFiltered = fromCache.filter(a => a !== undefined).map(a => unwrap(a));
      fromCacheFiltered.forEach(a => {
        this.#cache.set(a.pubkey, a);
      });
      this.#notifyChange(fromCacheFiltered.map(a => a.pubkey));
      console.debug(
        `Loaded ${fromCacheFiltered.length}/${keys.length} in ${(unixNowMs() - start).toLocaleString()} ms`
      );
      return mapped.filter(a => !a.has).map(a => a.key);
    }

    // no IndexdDB always return all keys
    return needsBuffer;
  }

  #notifyChange(keys: Array<HexKey>) {
    this.#hooks.filter(a => keys.includes(a.key)).forEach(h => h.fn());
  }
}

export const UserCache = new UserProfileCache();
