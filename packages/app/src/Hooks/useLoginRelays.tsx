import { useEffect } from "react";
import useLogin from "./useLogin";
import useEventPublisher from "./useEventPublisher";
import { RelaySettings, SystemInterface } from "@snort/system";

export function useLoginRelays() {
  const { relays } = useLogin();
  const { system } = useEventPublisher();

  useEffect(() => {
    if (relays) {
      updateRelayConnections(system, relays.item).catch(console.error);
    }
  }, [relays]);
}

export async function updateRelayConnections(system: SystemInterface, relays: Record<string, RelaySettings>) {
  if (SINGLE_RELAY) {
    system.ConnectToRelay(SINGLE_RELAY, { read: true, write: true });
  } else {
    for (const [k, v] of Object.entries(relays)) {
      await system.ConnectToRelay(k, v);
    }
    for (const v of system.Sockets) {
      if (!relays[v.address] && !v.ephemeral) {
        system.DisconnectRelay(v.address);
      }
    }
  }
}
