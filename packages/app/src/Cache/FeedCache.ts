import { db } from "Db";
import { Table } from "dexie";
import { unixNowMs, unwrap } from "Util";

type HookFn = () => void;

interface HookFilter {
  key: string;
  fn: HookFn;
}

export default abstract class FeedCache<TCached> {
  #name: string;
  #table: Table<TCached>;
  #hooks: Array<HookFilter> = [];
  #snapshot: Readonly<Array<TCached>> = [];
  #changed = true;
  #hits = 0;
  #miss = 0;
  protected onTable: Set<string> = new Set();
  protected cache: Map<string, TCached> = new Map();

  constructor(name: string, table: Table<TCached>) {
    this.#name = name;
    this.#table = table;
    setInterval(() => {
      console.debug(
        `[${this.#name}] ${this.cache.size} loaded, ${this.onTable.size} on-disk, ${this.#hooks.length} hooks, ${(
          (this.#hits / (this.#hits + this.#miss)) *
          100
        ).toFixed(1)} % hit`
      );
    }, 5_000);
  }

  async preload() {
    if (db.ready) {
      const keys = await this.#table.toCollection().primaryKeys();
      this.onTable = new Set<string>(keys.map(a => a as string));
    }
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
    if (key && !this.cache.has(key) && db.ready) {
      const cached = await this.#table.get(key);
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
    if (missing.length > 0 && db.ready) {
      const cached = await this.#table.bulkGet(missing);
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
    if (db.ready) {
      await this.#table.put(obj);
      this.onTable.add(k);
    }
    this.notifyChange([k]);
  }

  async bulkSet(obj: Array<TCached>) {
    if (db.ready) {
      await this.#table.bulkPut(obj);
      obj.forEach(a => this.onTable.add(this.key(a)));
    }
    obj.forEach(v => this.cache.set(this.key(v), v));
    this.notifyChange(obj.map(a => this.key(a)));
  }

  /**
   * Loads a list of rows from disk cache
   * @param keys List of ids to load
   * @returns Keys that do not exist on disk cache
   */
  async buffer(keys: Array<string>): Promise<Array<string>> {
    const needsBuffer = keys.filter(a => !this.cache.has(a));
    if (db.ready && needsBuffer.length > 0) {
      const mapped = needsBuffer.map(a => ({
        has: this.onTable.has(a),
        key: a,
      }));
      const start = unixNowMs();
      const fromCache = await this.#table.bulkGet(mapped.filter(a => a.has).map(a => a.key));
      const fromCacheFiltered = fromCache.filter(a => a !== undefined).map(a => unwrap(a));
      fromCacheFiltered.forEach(a => {
        this.cache.set(this.key(a), a);
      });
      this.notifyChange(fromCacheFiltered.map(a => this.key(a)));
      console.debug(
        `[${this.#name}] Loaded ${fromCacheFiltered.length}/${keys.length} in ${(
          unixNowMs() - start
        ).toLocaleString()} ms`
      );
      return mapped.filter(a => !a.has).map(a => a.key);
    }

    // no IndexdDB always return all keys
    return needsBuffer;
  }

  async clear() {
    await this.#table.clear();
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
