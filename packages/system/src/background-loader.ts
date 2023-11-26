import debug from "debug";
import { FeedCache, removeUndefined } from "@snort/shared";
import { SystemInterface, TaggedNostrEvent, RequestBuilder } from ".";

export abstract class BackgroundLoader<T extends { loaded: number; created: number }> {
  #system: SystemInterface;
  #cache: FeedCache<T>;
  #log = debug(this.name());

  /**
   * List of pubkeys to fetch metadata for
   */
  #wantsKeys = new Set<string>();

  /**
   * Custom loader function for fetching data from alternative sources
   */
  loaderFn?: (pubkeys: Array<string>) => Promise<Array<T>>;

  constructor(system: SystemInterface, cache: FeedCache<T>) {
    this.#system = system;
    this.#cache = cache;
    this.#FetchMetadata();
  }

  get Cache() {
    return this.#cache;
  }

  /**
   * Name of this loader service
   */
  abstract name(): string;

  /**
   * Handle fetched data
   */
  abstract onEvent(e: Readonly<TaggedNostrEvent>): T | undefined;

  /**
   * Get expire time as uxix milliseconds
   */
  abstract getExpireCutoff(): number;

  /**
   * Build subscription for missing keys
   */
  protected abstract buildSub(missing: Array<string>): RequestBuilder;

  /**
   * Create a placeholder value when no data can be found
   */
  protected abstract makePlaceholder(key: string): T | undefined;

  /**
   * Start requesting a set of keys to be loaded
   */
  TrackKeys(pk: string | Array<string>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      this.#wantsKeys.add(p);
    }
  }

  /**
   * Stop requesting a set of keys to be loaded
   */
  UntrackKeys(pk: string | Array<string>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      this.#wantsKeys.delete(p);
    }
  }

  /**
   * Get object from cache or fetch if missing
   */
  async fetch(key: string) {
    const existing = this.Cache.get(key);
    if (existing) {
      return existing;
    } else {
      return await new Promise<T>((resolve, reject) => {
        this.TrackKeys(key);
        const release = this.Cache.hook(() => {
          const existing = this.Cache.getFromCache(key);
          if (existing) {
            resolve(existing);
            release();
            this.UntrackKeys(key);
          }
        }, key);
      });
    }
  }

  async #FetchMetadata() {
    const loading = [...this.#wantsKeys];
    await this.#cache.buffer(loading);

    const missing = loading.filter(a => (this.#cache.getFromCache(a)?.loaded ?? 0) < this.getExpireCutoff());
    if (missing.length > 0) {
      this.#log("Fetching keys: %O", missing);
      try {
        const found = await this.#loadData(missing);
        const noResult = removeUndefined(
          missing.filter(a => !found.some(b => a === this.#cache.key(b))).map(a => this.makePlaceholder(a)),
        );
        if (noResult.length > 0) {
          await Promise.all(noResult.map(a => this.#cache.update(a)));
        }
      } catch (e) {
        this.#log("Error: %O", e);
        debugger;
      }
    }

    setTimeout(() => this.#FetchMetadata(), 500);
  }

  async #loadData(missing: Array<string>) {
    if (this.loaderFn) {
      const results = await this.loaderFn(missing);
      await Promise.all(results.map(a => this.#cache.update(a)));
      return results;
    } else {
      const v = await this.#system.Fetch(this.buildSub(missing), async e => {
        for (const pe of e) {
          const m = this.onEvent(pe);
          if (m) {
            await this.#cache.update(m);
          }
        }
      });
      return removeUndefined(v.map(this.onEvent));
    }
  }
}
