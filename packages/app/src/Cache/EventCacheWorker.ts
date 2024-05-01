import { CachedTable, CacheEvents } from "@snort/shared";
import { NostrEvent } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import { EventEmitter } from "eventemitter3";

export class EventCacheWorker extends EventEmitter<CacheEvents> implements CachedTable<NostrEvent> {
  #relay: WorkerRelayInterface;
  #keys = new Set<string>();
  #cache = new Map<string, NostrEvent>();

  constructor(relay: WorkerRelayInterface) {
    super();
    this.#relay = relay;
  }

  async preload() {
    const ids = await this.#relay.query([
      "REQ",
      "preload-event-cache",
      {
        ids_only: true,
      },
    ]);
    this.#keys = new Set<string>(ids as unknown as Array<string>);
  }

  async search(q: string) {
    const results = await this.#relay.query([
      "REQ",
      "events-search",
      {
        search: q,
      },
    ]);
    return results;
  }

  keysOnTable(): string[] {
    return [...this.#keys];
  }

  getFromCache(key?: string | undefined): NostrEvent | undefined {
    if (key) {
      return this.#cache.get(key);
    }
  }

  discover(ev: NostrEvent) {
    this.#keys.add(this.key(ev));
  }

  async get(key?: string | undefined): Promise<NostrEvent | undefined> {
    if (key) {
      const res = await this.bulkGet([key]);
      if (res.length > 0) {
        return res[0];
      }
    }
  }

  async bulkGet(keys: string[]): Promise<NostrEvent[]> {
    const results = await this.#relay.query([
      "REQ",
      "EventCacheWorker.bulkGet",
      {
        ids: keys,
      },
    ]);
    for (const ev of results) {
      this.#cache.set(ev.id, ev);
    }
    return results;
  }

  async set(obj: NostrEvent): Promise<void> {
    await this.#relay.event(obj);
    this.#keys.add(obj.id);
  }

  async bulkSet(obj: NostrEvent[] | readonly NostrEvent[]): Promise<void> {
    await Promise.all(
      obj.map(async a => {
        await this.#relay.event(a);
        this.#keys.add(a.id);
      }),
    );
  }

  async update<TWithCreated extends NostrEvent & { created: number; loaded: number }>(
    m: TWithCreated,
  ): Promise<"new" | "refresh" | "updated" | "no_change"> {
    if (await this.#relay.event(m)) {
      return "updated";
    }
    return "no_change";
  }

  async buffer(keys: string[]): Promise<string[]> {
    const missing = keys.filter(a => !this.#keys.has(a));
    const res = await this.bulkGet(missing);
    return missing.filter(a => !res.some(b => this.key(b) === a));
  }

  key(of: NostrEvent): string {
    return of.id;
  }

  snapshot(): NostrEvent[] {
    return [...this.#cache.values()];
  }
}
