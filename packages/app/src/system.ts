import { removeUndefined, throwIfOffline } from "@snort/shared";
import LRUSet from "@snort/shared/src/LRUSet";
import { mapEventToProfile, NostrEvent, NostrSystem, ProfileLoaderService, socialGraphInstance } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import WorkerRelayPath from "@snort/worker-relay/dist/worker?worker&url";

import { RelayMetrics, SystemDb, UserCache, UserRelays } from "@/Cache";
import { addCachedMetadataToFuzzySearch, addEventToFuzzySearch } from "@/Db/FuzzySearch";
import { LoginStore } from "@/Utils/Login";
import { hasWasm, WasmOptimizer } from "@/Utils/wasm";

/**
 * Singleton nostr system
 */
export const System = new NostrSystem({
  relayCache: UserRelays,
  profileCache: UserCache,
  relayMetrics: RelayMetrics,
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
  addEventToFuzzySearch(ev);
  socialGraphInstance.handleEvent(ev);
});

System.profileCache.on("change", keys => {
  const changed = removeUndefined(keys.map(a => System.profileCache.getFromCache(a)));
  changed.forEach(addCachedMetadataToFuzzySearch);
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

export const Relay = new WorkerRelayInterface(WorkerRelayPath);
let relayInitStarted = false;
export async function initRelayWorker() {
  if (relayInitStarted) return;
  relayInitStarted = true;
  try {
    if (await Relay.init()) {
      if (await Relay.open()) {
        await Relay.migrate();
        const seen = new LRUSet<string>(100);
        System.on("event", async (_, ev) => {
          if (seen.has(ev.id)) return;
          seen.add(ev.id);
          await Relay.event(ev);
        });
        System.on("request", async (subId, f) => {
          const evs = await Relay.req(["REQ", "", ...f.filters]);
          evs.forEach(ev => {
            seen.add(ev.id);
            queueMicrotask(() => {
              System.HandleEvent(subId, { ...ev, relays: [] });
            });
          });
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Singleton user profile loader
 */
export const ProfileLoader = new ProfileLoaderService(System, UserCache);
