import { CachedTable, CacheEvents, removeUndefined, unixNowMs, unwrap } from "@snort/shared";
import { CacheRelay, EventKind, NostrEvent, UsersFollows } from "@snort/system";
import debug from "debug";
import { EventEmitter } from "eventemitter3";

export class UserFollowsWorker extends EventEmitter<CacheEvents<UsersFollows>> implements CachedTable<UsersFollows> {
  #relay: CacheRelay;
  #keys = new Set<string>();
  #cache = new Map<string, UsersFollows>();
  #log = debug("UserFollowsWorker");

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
        kinds: [3],
      },
    ]);
    this.#cache = new Map<string, UsersFollows>(profiles.map(a => [a.pubkey, unwrap(mapEventToUserFollows(a))]));
    this.#keys = new Set<string>(this.#cache.keys());
    this.#log(`Loaded %d/%d in %d ms`, this.#cache.size, this.#keys.size, (unixNowMs() - start).toLocaleString());
  }

  async search(q: string) {
    const results = await this.#relay.query([
      "REQ",
      "contacts-search",
      {
        kinds: [3],
        search: q,
      },
    ]);
    return removeUndefined(results.map(mapEventToUserFollows));
  }

  keysOnTable(): string[] {
    return [...this.#keys];
  }

  getFromCache(key?: string | undefined): UsersFollows | undefined {
    if (key) {
      return this.#cache.get(key);
    }
  }

  discover(ev: NostrEvent) {
    this.#keys.add(ev.pubkey);
  }

  async get(key?: string | undefined): Promise<UsersFollows | undefined> {
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
      "UserFollowsWorker.bulkGet",
      {
        authors: keys,
        kinds: [3],
      },
    ]);
    const mapped = removeUndefined(results.map(a => mapEventToUserFollows(a)));
    for (const pf of mapped) {
      this.#cache.set(this.key(pf), pf);
    }
    this.emit(
      "change",
      mapped.map(a => this.key(a)),
    );
    return mapped;
  }

  async set(obj: UsersFollows) {
    this.#keys.add(this.key(obj));
  }

  async bulkSet(obj: UsersFollows[] | readonly UsersFollows[]) {
    const mapped = obj.map(a => this.key(a));
    mapped.forEach(a => this.#keys.add(a));
    // todo: store in cache
    this.emit("change", mapped);
  }

  async update(): Promise<"new" | "refresh" | "updated" | "no_change"> {
    // do nothing
    return "refresh";
  }

  async buffer(keys: string[]): Promise<string[]> {
    const missing = keys.filter(a => !this.#keys.has(a));
    const res = await this.bulkGet(missing);
    return missing.filter(a => !res.some(b => this.key(b) === a));
  }

  key(of: UsersFollows): string {
    return of.pubkey;
  }

  snapshot(): UsersFollows[] {
    return [...this.#cache.values()];
  }
}

export function mapEventToUserFollows(ev: NostrEvent): UsersFollows | undefined {
  if (ev.kind !== EventKind.ContactList) return;

  return {
    pubkey: ev.pubkey,
    loaded: unixNowMs(),
    created: ev.created_at,
    follows: ev.tags,
  };
}
