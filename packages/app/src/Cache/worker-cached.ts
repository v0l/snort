import { CachedTable, CacheEvents, removeUndefined, unixNowMs } from "@snort/shared";
import { CacheRelay, NostrEvent, ReqFilter, CachedBase } from "@snort/system";
import debug from "debug";
import { EventEmitter } from "eventemitter3";
import { LRUCache } from "typescript-lru-cache";

/**
 * Generic worker relay based cache, key by pubkey
 */
export abstract class WorkerBaseCache<T extends CachedBase>
  extends EventEmitter<CacheEvents<T>>
  implements CachedTable<T>
{
  #relay: CacheRelay;
  #cache = new LRUCache<string, T>({ maxSize: this.maxSize() });
  #keys = new Set<string>();
  #log = debug(this.name());

  constructor(
    readonly kind: number,
    relay: CacheRelay,
  ) {
    super();
    this.#relay = relay;
  }

  async clear() {
    this.#cache.clear();
    this.emit("change", []);
  }

  key(of: T): string {
    return of.pubkey;
  }

  abstract name(): string;
  abstract maxSize(): number;
  abstract mapper(ev: NostrEvent): T | undefined;

  /**
   * Preload only the ids from the worker relay
   */
  async preload() {
    await this.preloadTable(`${this.name()}-preload-ids`, { kinds: [this.kind], ids_only: true });
  }

  /**
   * Reload the table with a request filter
   */
  protected async preloadTable(id: string, f: ReqFilter) {
    const start = unixNowMs();
    const data = await this.#relay.query(["REQ", id, f]);
    if (f.ids_only === true) {
      this.#keys = new Set(data as unknown as Array<string>);
    } else {
      const mapped = removeUndefined(data.map(a => this.mapper(a)));
      for (const o of mapped) {
        this.#cache.set(o.pubkey, o);
      }
    }
    this.#log(`Loaded %d/%d in %d ms`, this.#cache.size, this.#keys.size, (unixNowMs() - start).toLocaleString());
  }

  async search(q: string) {
    const results = await this.#relay.query([
      "REQ",
      `${this.name()}-search`,
      {
        kinds: [this.kind],
        search: q,
      },
    ]);
    return removeUndefined(results.map(this.mapper));
  }

  keysOnTable(): string[] {
    return [...this.#keys];
  }

  getFromCache(key?: string | undefined) {
    if (key) {
      return this.#cache.get(key) || undefined;
    }
  }

  discover(ev: NostrEvent) {
    this.#keys.add(ev.pubkey);
  }

  async get(key?: string | undefined): Promise<T | undefined> {
    if (key) {
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
      `${this.name()}-bulk`,
      {
        authors: keys,
        kinds: [this.kind],
      },
    ]);
    const mapped = removeUndefined(results.map(this.mapper));
    for (const pf of mapped) {
      this.#cache.set(pf.pubkey, pf);
    }
    this.emit(
      "change",
      mapped.map(a => a.pubkey),
    );
    return mapped;
  }

  /**
   * Because the internal type is different than T we cannot actually persist this value into the worker relay
   * meaning that we can only update our internal cache, implementations must ensure that their data is externally
   * persisted into the worker relay
   */
  private setInternal(obj: T) {
    const k = this.key(obj);
    const cached = this.#cache.get(k);
    if (cached?.loaded && cached?.loaded >= obj.loaded) {
      return; //skip if newer is in cache
    }

    this.#keys.add(k);
    this.#cache.set(k, obj);
  }

  async set(obj: T) {
    this.setInternal(obj);
    this.emit("change", [this.key(obj)]);
  }

  async bulkSet(obj: T[] | readonly T[]) {
    obj.map(a => this.setInternal(a));
    this.emit("change", obj.map(this.key));
  }

  async update(obj: T): Promise<"new" | "refresh" | "updated" | "no_change"> {
    await this.set(obj);
    return "updated";
  }

  async buffer(keys: string[]): Promise<string[]> {
    const missing = keys.filter(a => !this.#cache.has(a));
    const res = await this.bulkGet(missing);
    return missing.filter(a => !res.some(b => this.key(b) === a));
  }

  snapshot(): T[] {
    return [...this.#cache.values()];
  }
}
