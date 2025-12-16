import { removeUndefined } from "@snort/shared";
import type { NostrEvent, OkResponse, SystemInterface } from "@snort/system";

export async function sendEventToRelays(
  system: SystemInterface,
  ev: NostrEvent,
  customRelays?: Array<string>,
  setResults?: (x: Array<OkResponse>) => void,
) {
  if (customRelays) {
    system.HandleEvent("*", { ...ev, relays: [] });
    return removeUndefined(
      await Promise.all(
        customRelays.map(async r => {
          try {
            return await system.WriteOnceToRelay(r, ev);
          } catch (e) {
            console.error(e);
          }
        }),
      ),
    );
  } else {
    const responses: OkResponse[] = await system.BroadcastEvent(ev);
    setResults?.(responses);
    return responses;
  }
}
