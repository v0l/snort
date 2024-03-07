import { RelayMetricCache, UserRelaysCache } from "@snort/system";
import { SnortSystemDb } from "@snort/system-web";
import { WorkerRelayInterface } from "@snort/worker-relay";
import WorkerVite from "@snort/worker-relay/src/worker?worker";

import { EventCacheWorker } from "./EventCacheWorker";
import { GiftWrapCache } from "./GiftWrapCache";
import { ProfileCacheRelayWorker } from "./ProfileWorkerCache";
import { UserFollowsWorker } from "./UserFollowsWorker";

export const Relay = new WorkerRelayInterface(
  import.meta.env.DEV ? new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url) : new WorkerVite(),
);
export async function initRelayWorker() {
  try {
    await Relay.init("relay.db");
  } catch (e) {
    console.error(e);
  }
}

export const SystemDb = new SnortSystemDb();
export const UserRelays = new UserRelaysCache(SystemDb.userRelays);
export const RelayMetrics = new RelayMetricCache(SystemDb.relayMetrics);

export const UserFollows = new UserFollowsWorker(Relay);
export const UserCache = new ProfileCacheRelayWorker(Relay);
export const EventsCache = new EventCacheWorker(Relay);

export const GiftsCache = new GiftWrapCache();

export async function preload(follows?: Array<string>) {
  const preloads = [
    UserCache.preload(),
    RelayMetrics.preload(),
    GiftsCache.preload(),
    UserRelays.preload(follows),
    EventsCache.preload(),
    UserFollows.preload(),
  ];
  await Promise.all(preloads);
}
