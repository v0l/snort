import { removeUndefined, throwIfOffline } from "@snort/shared";
import { mapEventToProfile, NostrEvent, NostrSystem, socialGraphInstance } from "@snort/system";
import inMemoryDB from "@snort/system/src/InMemoryDB";

import { EventsCache, Relay, RelayMetrics, SystemDb, UserCache, UserRelays } from "@/Cache";
import { addEventToFuzzySearch } from "@/Db/FuzzySearch";
import { LoginStore } from "@/Utils/Login";
import { hasWasm, WasmOptimizer } from "@/Utils/wasm";

/**
 * Singleton nostr system
 */
export const System = new NostrSystem({
  relayCache: UserRelays,
  eventsCache: EventsCache,
  profileCache: UserCache,
  relayMetrics: RelayMetrics,
  cacheRelay: Relay,
  optimizer: hasWasm ? WasmOptimizer : undefined,
  db: SystemDb,
});

System.on("auth", async (c, r, cb) => {
  const { id } = LoginStore.snapshot();
  const pub = LoginStore.getPublisher(id);
  if (pub) {
    cb(await pub.nip42Auth(c, r));
  }
});

System.on("event", (_, ev) => {
  Relay.event(ev);
  EventsCache.discover(ev);
  UserCache.discover(ev);
  inMemoryDB.handleEvent(ev);
  socialGraphInstance.handleEvent(ev);
  addEventToFuzzySearch(ev);
});

/**
 * Add profile loader fn
 */
if (CONFIG.httpCache) {
  System.profileLoader.loaderFn = async (keys: Array<string>) => {
    return removeUndefined(await Promise.all(keys.map(a => fetchProfile(a))));
  };
}

export async function fetchProfile(key: string) {
  try {
    throwIfOffline();
    const rsp = await fetch(`${CONFIG.httpCache}/profile/${key}`);
    if (rsp.ok) {
      const data = (await rsp.json()) as NostrEvent;
      if (data) {
        return mapEventToProfile(data);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
