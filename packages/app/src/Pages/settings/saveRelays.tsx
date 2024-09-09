import { EventPublisher, FullRelaySettings, RelaySettings, SystemInterface } from "@snort/system";

import { Blasters } from "@/Utils/Const";

export async function saveRelays(
  system: SystemInterface,
  publisher: EventPublisher | undefined,
  relays: Array<FullRelaySettings> | Record<string, RelaySettings>,
) {
  if (publisher) {
    const ev = await publisher.relayList(relays);
    system.BroadcastEvent(ev);
    Promise.all(Blasters.map(a => system.WriteOnceToRelay(a, ev)));
  }
}
