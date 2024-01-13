import { removeUndefined, throwIfOffline } from "@snort/shared";
import {
  BuiltRawReqFilter,
  mapEventToProfile,
  NostrEvent,
  NostrSystem,
  ProfileLoaderService,
  socialGraphInstance,
  TaggedNostrEvent,
} from "@snort/system";
import * as Comlink from "comlink";

import { RelayMetrics, SystemDb, UserCache, UserRelays } from "@/Cache";
import { addCachedMetadataToFuzzySearch, addEventToFuzzySearch } from "@/Db/FuzzySearch";
import IndexedDBWorker from "@/Db/IndexedDB?worker";
import { LoginStore } from "@/Utils/Login";
import { hasWasm, WasmOptimizer } from "@/Utils/wasm";

export const indexedDB = Comlink.wrap(new IndexedDBWorker());

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
  if (CONFIG.useIndexedDBEvents) {
    indexedDB.handleEvent(ev);
  }
});

System.on("filters", (req: BuiltRawReqFilter) => {
  if (CONFIG.useIndexedDBEvents) {
    req.filters.forEach(filter => {
      indexedDB.find(
        filter,
        Comlink.proxy((e: TaggedNostrEvent) => {
          queueMicrotask(() => {
            System.HandleEvent(e);
          });
        }),
      );
    });
  }
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

/**
 * Singleton user profile loader
 */
export const ProfileLoader = new ProfileLoaderService(System, UserCache);
