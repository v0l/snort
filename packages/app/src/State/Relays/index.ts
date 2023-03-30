import { FullRelaySettings, HexKey } from "@snort/nostr";
import { db } from "Db";
import { unixNowMs, unwrap } from "Util";

export class UserRelays {
  #store: Map<HexKey, Array<FullRelaySettings>>;

  #snapshot: Readonly<Map<HexKey, Array<FullRelaySettings>>>;

  constructor() {
    this.#store = new Map();
    this.#snapshot = Object.freeze(new Map());
  }

  get snapshot() {
    return this.#snapshot;
  }

  async get(key: HexKey) {
    if (!this.#store.has(key) && db.ready) {
      const cached = await db.userRelays.get(key);
      if (cached) {
        this.#store.set(key, cached.relays);
        return cached.relays;
      }
    }
    return this.#store.get(key);
  }

  async bulkGet(keys: Array<HexKey>) {
    const missing = keys.filter(a => !this.#store.has(a));
    if (missing.length > 0 && db.ready) {
      const cached = await db.userRelays.bulkGet(missing);
      cached.forEach(a => {
        if (a) {
          this.#store.set(a.pubkey, a.relays);
        }
      });
    }
    return new Map(keys.map(a => [a, this.#store.get(a) ?? []]));
  }

  async set(key: HexKey, relays: Array<FullRelaySettings>) {
    this.#store.set(key, relays);
    if (db.ready) {
      await db.userRelays.put({
        pubkey: key,
        relays,
      });
    }
    this._update();
  }

  async bulkSet(obj: Record<HexKey, Array<FullRelaySettings>>) {
    if (db.ready) {
      await db.userRelays.bulkPut(
        Object.entries(obj).map(([k, v]) => {
          return {
            pubkey: k,
            relays: v,
          };
        })
      );
    }
    Object.entries(obj).forEach(([k, v]) => this.#store.set(k, v));
    this._update();
  }

  async preload() {
    const start = unixNowMs();
    const keys = await db.userRelays.toCollection().keys();
    const fullCache = await db.userRelays.bulkGet(keys);
    this.#store = new Map(fullCache.filter(a => a !== undefined).map(a => [unwrap(a).pubkey, a?.relays ?? []]));
    this._update();
    console.debug(`Preloaded ${this.#store.size} users relays in ${(unixNowMs() - start).toLocaleString()} ms`);
  }

  private _update() {
    this.#snapshot = Object.freeze(new Map(this.#store));
  }
}

export const FollowsRelays = new UserRelays();
