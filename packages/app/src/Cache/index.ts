import { UserProfileCache, UserRelaysCache } from "@snort/system";
import { DmCache } from "./DMCache";
import { InteractionCache } from "./EventInteractionCache";

export const UserCache = new UserProfileCache();
export const UserRelays = new UserRelaysCache();
export { DmCache };

export async function preload(follows?: Array<string>) {
  const preloads = [
    UserCache.preload(follows),
    DmCache.preload(),
    InteractionCache.preload(),
    UserRelays.preload(follows),
  ];
  await Promise.all(preloads);
}
