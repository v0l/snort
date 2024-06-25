import debug from "debug";
import { removeUndefined, unixNowMs } from "./utils";
import { DexieTableLike } from "./dexie-like";
import { EventEmitter } from "eventemitter3";

type HookFn = () => void;

export interface KeyedHookFilter {
  key: string;
  fn: HookFn;
}

export interface CacheEvents<T> {
  change: (keys: Array<string>) => void;
  update: (v: T) => void;
}

export type CachedTable<T> = {
  preload(follows?: Array<string>): Promise<void>;
  keysOnTable(): Array<string>;
  getFromCache(key?: string): T | undefined;
  get(key?: string): Promise<T | undefined>;
  bulkGet(keys: Array<string>): Promise<Array<T>>;
  set(obj: T): Promise<void>;
  bulkSet(obj: Array<T> | Readonly<Array<T>>): Promise<void>;

  /**
   * Try to update an entry where created values exists
   * @param m Profile metadata
   * @returns
   */
  update<TWithCreated extends T & { created: number; loaded: number }>(
    m: TWithCreated,
  ): Promise<"new" | "refresh" | "updated" | "no_change">;

  /**
   * Loads a list of rows from disk cache
   * @param keys List of ids to load
   * @returns Keys that do not exist on disk cache
   */
  buffer(keys: Array<string>): Promise<Array<string>>;
  key(of: T): string;
  snapshot(): Array<T>;
  search(q: string): Promise<Array<T>>;
} & EventEmitter<CacheEvents<T>>;

/**
 * Dexie backed generic hookable store
 */
export abstract class FeedCache<TCached> extends EventEmitter<CacheEvents<TCached>> implements CachedTable<TCached> {
  readonly name: string;
  #snapshot: Array<TCached> = [];
  protected log: ReturnType<typeof debug>;
  #hits = 0;
  #miss = 0;
  protected table?: DexieTableLike<TCached>;
  protected onTable: Set<string> = new Set();
  protected cache: Map<string, TCached> = new Map();

  constructor(name: string, table?: DexieTableLike<TCached>) {
    super();
    this.name = name;
    this.table = table;
    this.log = debug(name);
    setInterval(() => {
      this.log(
        "%d loaded, %d on-disk, %d hooks, %d% hit",
        this.cache.size,
        this.onTable.size,
        this.listenerCount("change"),
        ((this.#hits / (this.#hits + this.#miss)) * 100).toFixed(1),
      );
    }, 30_000);
    this.on("change", () => {
      this.#snapshot = this.takeSnapshot();
    });
  }

  async preload() {
    // assume already preloaded if keys exist on table in memory
    if (this.onTable.size === 0) {
      const keys = (await this.table?.toCollection().primaryKeys()) ?? [];
      this.onTable = new Set<string>(keys.map(a => a as string));
    }
  }

  hook(fn: HookFn, key: string | undefined) {
    const handle = (keys: Array<string>) => {
      if (!key || keys.includes(key)) {
        fn();
      }
    };
    this.on("change", handle);
    return () => this.off("change", handle);
  }

  keysOnTable() {
    return [...this.onTable];
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
        this.emit("change", [key]);
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
    return removeUndefined(keys.map(a => this.cache.get(a)));
  }

  async set(obj: TCached) {
    const k = this.key(obj);
    this.cache.set(k, obj);
    if (this.table) {
      try {
        await this.table.put(obj);
        this.onTable.add(k);
      } catch (e) {
        console.error(e);
      }
    }
    this.emit("change", [k]);
  }

  async bulkSet(obj: Array<TCached> | Readonly<Array<TCached>>) {
    if (this.table) {
      try {
        await this.table.bulkPut(obj);
        obj.forEach(a => this.onTable.add(this.key(a)));
      } catch (e) {
        console.error(e);
      }
    }
    obj.forEach(v => this.cache.set(this.key(v), v));
    this.emit(
      "change",
      obj.map(a => this.key(a)),
    );
  }

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
    this.log("Updating %s %s %o", k, updateType, m);
    if (updateType !== "no_change") {
      const updated = {
        ...existing,
        ...m,
      };
      await this.set(updated);
    }
    return updateType;
  }

  async buffer(keys: Array<string>): Promise<Array<string>> {
    const needsBuffer = keys.filter(a => !this.cache.has(a));
    if (this.table && needsBuffer.length > 0) {
      const mapped = needsBuffer.map(a => ({
        has: this.onTable.has(a),
        key: a,
      }));
      const start = unixNowMs();
      const fromCache = removeUndefined(await this.table.bulkGet(mapped.filter(a => a.has).map(a => a.key)));
      fromCache.forEach(a => {
        this.cache.set(this.key(a), a);
      });
      this.emit(
        "change",
        fromCache.map(a => this.key(a)),
      );
      this.log(`Loaded %d/%d in %d ms`, fromCache.length, keys.length, (unixNowMs() - start).toLocaleString());
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
    return this.#snapshot;
  }

  abstract key(of: TCached): string;
  abstract takeSnapshot(): Array<TCached>;
  abstract search(q: string): Promise<Array<TCached>>;
}
