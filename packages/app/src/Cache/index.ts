import { UserProfileCache, UserRelaysCache, RelayMetricCache } from "@snort/system";
import { InteractionCache } from "./EventInteractionCache";
import { ChatCache } from "./ChatCache";

export const UserCache = new UserProfileCache();
export const UserRelays = new UserRelaysCache();
export const RelayMetrics = new RelayMetricCache();
export const Chats = new ChatCache();

export async function preload(follows?: Array<string>) {
  const preloads = [
    UserCache.preload(follows),
    Chats.preload(),
    InteractionCache.preload(),
    UserRelays.preload(follows),
    RelayMetrics.preload(),
  ];
  await Promise.all(preloads);
}
