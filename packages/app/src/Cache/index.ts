import { RelayMetricCache, UserRelaysCache } from "@snort/system";
import { SnortSystemDb } from "@snort/system-web";
import { WorkerRelayInterface } from "@snort/worker-relay";
import WorkerRelayPath from "@snort/worker-relay/dist/worker?worker&url";

import { EventCacheWorker } from "./EventCacheWorker";
import { GiftWrapCache } from "./GiftWrapCache";
import { ProfileCacheRelayWorker } from "./ProfileWorkerCache";

export const Relay = new WorkerRelayInterface(WorkerRelayPath);
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
  ];
  await Promise.all(preloads);
}
