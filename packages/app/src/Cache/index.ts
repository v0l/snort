import { UserProfileCache, UserRelaysCache, RelayMetricCache } from "@snort/system";
import { EventInteractionCache } from "./EventInteractionCache";
import { ChatCache } from "./ChatCache";
import { Payments } from "./PaymentsCache";
import { GiftWrapCache } from "./GiftWrapCache";
import { NotificationsCache } from "./Notifications";

export const UserCache = new UserProfileCache();
export const UserRelays = new UserRelaysCache();
export const RelayMetrics = new RelayMetricCache();
export const Chats = new ChatCache();
export const PaymentsCache = new Payments();
export const InteractionCache = new EventInteractionCache();
export const GiftsCache = new GiftWrapCache();
export const Notifications = new NotificationsCache();

export async function preload(follows?: Array<string>) {
  const preloads = [
    UserCache.preload(follows),
    Chats.preload(),
    InteractionCache.preload(),
    UserRelays.preload(follows),
    RelayMetrics.preload(),
    GiftsCache.preload(),
    Notifications.preload(),
  ];
  await Promise.all(preloads);
}
