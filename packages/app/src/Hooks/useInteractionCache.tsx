import { useSyncExternalStore } from "react";
import { HexKey, u256 } from "@snort/system";

import { InteractionCache } from "Cache";
import { EventInteraction } from "Db";
import { sha256, unwrap } from "SnortUtils";

export function useInteractionCache(pubkey?: HexKey, event?: u256) {
  const id = event && pubkey ? sha256(event + pubkey) : undefined;
  const EmptyInteraction = {
    id,
    event,
    by: pubkey,
  } as EventInteraction;
  const data =
    useSyncExternalStore(
      c => InteractionCache.hook(c, id),
      () => InteractionCache.snapshot().find(a => a.id === id),
    ) || EmptyInteraction;
  return {
    data: data,
    react: () =>
      InteractionCache.set({
        ...data,
        event: unwrap(event),
        by: unwrap(pubkey),
        reacted: true,
      }),
    zap: () =>
      InteractionCache.set({
        ...data,
        event: unwrap(event),
        by: unwrap(pubkey),
        zapped: true,
      }),
    repost: () =>
      InteractionCache.set({
        ...data,
        event: unwrap(event),
        by: unwrap(pubkey),
        reposted: true,
      }),
  };
}
