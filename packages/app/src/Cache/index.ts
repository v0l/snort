import { RelayMetricCache,UserProfileCache, UserRelaysCache } from "@snort/system";
import { SnortSystemDb } from "@snort/system-web";

import { ChatCache } from "./ChatCache";
import { EventInteractionCache } from "./EventInteractionCache";
import { FollowListCache } from "./FollowListCache";
import { FollowsFeedCache } from "./FollowsFeed";
import { GiftWrapCache } from "./GiftWrapCache";
import { NotificationsCache } from "./Notifications";
import { Payments } from "./PaymentsCache";

export const SystemDb = new SnortSystemDb();
export const UserCache = new UserProfileCache(SystemDb.users);
export const UserRelays = new UserRelaysCache(SystemDb.userRelays);
export const RelayMetrics = new RelayMetricCache(SystemDb.relayMetrics);

export const Chats = new ChatCache();
export const PaymentsCache = new Payments();
export const InteractionCache = new EventInteractionCache();
export const GiftsCache = new GiftWrapCache();
export const Notifications = new NotificationsCache();
export const FollowsFeed = new FollowsFeedCache();
export const FollowLists = new FollowListCache();

export async function preload(follows?: Array<string>) {
  const preloads = [
    UserCache.preload(follows),
    Chats.preload(),
    InteractionCache.preload(),
    UserRelays.preload(follows),
    RelayMetrics.preload(),
    GiftsCache.preload(),
    Notifications.preload(),
    FollowsFeed.preload(),
    FollowLists.preload(),
  ];
  await Promise.all(preloads);
}
