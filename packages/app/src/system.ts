import { NostrSystem } from "@snort/system";

import { Relay, ProfilesCache, UserFollows, UserRelays } from "@/Cache";
import { addEventToFuzzySearch } from "@/Db/FuzzySearch";
import { LoginStore } from "@/Utils/Login";
import { hasWasm, WasmOptimizer } from "@/Utils/wasm";

/**
 * Singleton nostr system
 */
export const System = new NostrSystem({
  relays: UserRelays,
  profiles: ProfilesCache,
  cachingRelay: Relay,
  contactLists: UserFollows,
  optimizer: hasWasm ? WasmOptimizer : undefined,
  buildFollowGraph: true,
  automaticOutboxModel: true,
});

System.on("auth", async (c, r, cb) => {
  const { id } = LoginStore.snapshot();
  const pub = LoginStore.getPublisher(id);
  if (pub) {
    cb(await pub.nip42Auth(c, r));
  }
});

System.pool.on("event", (_relay, _sub, ev) => {
  if (ev.kind === 0) {
    if ("discover" in ProfilesCache) {
      ProfilesCache.discover(ev);
    }
    addEventToFuzzySearch(ev);
  }
});
