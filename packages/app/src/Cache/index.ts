import { RelayMetricCache, UserProfileCache, UserRelaysCache } from "@snort/system";
import { SnortSystemDb } from "@snort/system-web";

import { ChatCache } from "./ChatCache";
import { GiftWrapCache } from "./GiftWrapCache";

export const SystemDb = new SnortSystemDb();
export const UserCache = new UserProfileCache(SystemDb.users);
export const UserRelays = new UserRelaysCache(SystemDb.userRelays);
export const RelayMetrics = new RelayMetricCache(SystemDb.relayMetrics);

export const Chats = new ChatCache();
export const GiftsCache = new GiftWrapCache();

export async function preload(follows?: Array<string>) {
  const preloads = [
    UserCache.preload(follows),
    Chats.preload(),
    RelayMetrics.preload(),
    GiftsCache.preload(),
    UserRelays.preload(follows),
  ];
  await Promise.all(preloads);
}
