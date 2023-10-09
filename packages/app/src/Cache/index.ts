import { UserProfileCache, UserRelaysCache, RelayMetricCache } from "@snort/system";
import { SnortSystemDb } from "@snort/system-web";

import { EventInteractionCache } from "./EventInteractionCache";
import { ChatCache } from "./ChatCache";
import { Payments } from "./PaymentsCache";
import { GiftWrapCache } from "./GiftWrapCache";
import { NotificationsCache } from "./Notifications";
import { FollowsFeedCache } from "./FollowsFeed";

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
  ];
  await Promise.all(preloads);
}
