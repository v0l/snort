import { DmCache } from "./DMCache";
import { InteractionCache } from "./EventInteractionCache";
import { UserCache } from "./UserCache";
import { UserRelays } from "./UserRelayCache";

export async function preload(follows?: Array<string>) {
  const preloads = [
    UserCache.preload(follows),
    DmCache.preload(),
    InteractionCache.preload(),
    UserRelays.preload(follows),
  ];
  await Promise.all(preloads);
}

export { UserCache, DmCache };
