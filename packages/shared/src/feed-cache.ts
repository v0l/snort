import debug from "debug";
import { Table } from "dexie";
import { unixNowMs, unwrap } from "./utils";

type HookFn = () => void;

export interface KeyedHookFilter {
  key: string;
  fn: HookFn;
}

/**
 * Dexie backed generic hookable store
 */
export abstract class FeedCache<TCached> {
  #name: string;
  #hooks: Array<KeyedHookFilter> = [];
  #snapshot: Readonly<Array<TCached>> = [];
  #changed = true;
  #hits = 0;
  #miss = 0;
  protected table?: Table<TCached>;
  protected onTable: Set<string> = new Set();
  protected cache: Map<string, TCached> = new Map();

  constructor(name: string, table?: Table<TCached>) {
    this.#name = name;
    this.table = table;
    setInterval(() => {
      debug(this.#name)(
        "%d loaded, %d on-disk, %d hooks, %d% hit",
        this.cache.size,
        this.onTable.size,
        this.#hooks.length,
        ((this.#hits / (this.#hits + this.#miss)) * 100).toFixed(1)
      );
    }, 30_000);
  }

  async preload() {
    const keys = (await this.table?.toCollection().primaryKeys()) ?? [];
    this.onTable = new Set<string>(keys.map(a => a as string));
  }

  hook(fn: HookFn, key: string | undefined) {
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

  getFromCache(key?: string) {
    if (key) {
      const ret = this.cache.get(key);
      if (ret) {
        this.#hits++;
      } else {
        this.#miss++;
      }
      return ret;
    }
  }

  async get(key?: string) {
    if (key && !this.cache.has(key) && this.table) {
      const cached = await this.table.get(key);
      if (cached) {
        this.cache.set(this.key(cached), cached);
        this.notifyChange([key]);
        return cached;
      }
    }
    return key ? this.cache.get(key) : undefined;
  }

  async bulkGet(keys: Array<string>) {
    const missing = keys.filter(a => !this.cache.has(a));
    if (missing.length > 0 && this.table) {
      const cached = await this.table.bulkGet(missing);
      cached.forEach(a => {
        if (a) {
          this.cache.set(this.key(a), a);
        }
      });
    }
    return keys
      .map(a => this.cache.get(a))
      .filter(a => a)
      .map(a => unwrap(a));
  }

  async set(obj: TCached) {
    const k = this.key(obj);
    this.cache.set(k, obj);
    if (this.table) {
      await this.table.put(obj);
      this.onTable.add(k);
    }
    this.notifyChange([k]);
  }

  async bulkSet(obj: Array<TCached>) {
    if (this.table) {
      await this.table.bulkPut(obj);
      obj.forEach(a => this.onTable.add(this.key(a)));
    }
    obj.forEach(v => this.cache.set(this.key(v), v));
    this.notifyChange(obj.map(a => this.key(a)));
  }

  /**
   * Try to update an entry where created values exists
   * @param m Profile metadata
   * @returns
   */
  async update<TCachedWithCreated extends TCached & { created: number; loaded: number }>(m: TCachedWithCreated) {
    const k = this.key(m);
    const existing = this.getFromCache(k) as TCachedWithCreated;
    const updateType = (() => {
      if (!existing) {
        return "new";
      }
      if (existing.created < m.created) {
        return "updated";
      }
      if (existing && existing.loaded < m.loaded) {
        return "refresh";
      }
      return "no_change";
    })();
    debug(this.#name)("Updating %s %s %o", k, updateType, m);
    if (updateType !== "no_change") {
      const updated = {
        ...existing,
        ...m,
      };
      await this.set(updated);
    }
    return updateType;
  }

  /**
   * Loads a list of rows from disk cache
   * @param keys List of ids to load
   * @returns Keys that do not exist on disk cache
   */
  async buffer(keys: Array<string>): Promise<Array<string>> {
    const needsBuffer = keys.filter(a => !this.cache.has(a));
    if (this.table && needsBuffer.length > 0) {
      const mapped = needsBuffer.map(a => ({
        has: this.onTable.has(a),
        key: a,
      }));
      const start = unixNowMs();
      const fromCache = await this.table.bulkGet(mapped.filter(a => a.has).map(a => a.key));
      const fromCacheFiltered = fromCache.filter(a => a !== undefined).map(a => unwrap(a));
      fromCacheFiltered.forEach(a => {
        this.cache.set(this.key(a), a);
      });
      this.notifyChange(fromCacheFiltered.map(a => this.key(a)));
      debug(this.#name)(
        `Loaded %d/%d in %d ms`,
        fromCacheFiltered.length,
        keys.length,
        (unixNowMs() - start).toLocaleString()
      );
      return mapped.filter(a => !a.has).map(a => a.key);
    }

    // no IndexdDB always return all keys
    return needsBuffer;
  }

  async clear() {
    await this.table?.clear();
    this.cache.clear();
    this.onTable.clear();
  }

  snapshot() {
    if (this.#changed) {
      this.#snapshot = this.takeSnapshot();
      this.#changed = false;
    }
    return this.#snapshot;
  }

  protected notifyChange(keys: Array<string>) {
    this.#changed = true;
    this.#hooks.filter(a => keys.includes(a.key) || a.key === "*").forEach(h => h.fn());
  }

  abstract key(of: TCached): string;
  abstract takeSnapshot(): Array<TCached>;
}
