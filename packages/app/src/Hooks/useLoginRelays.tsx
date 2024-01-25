import { RelaySettings, SystemInterface } from "@snort/system";
import { useEffect } from "react";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

export function useLoginRelays() {
  const relays = useLogin(s => s.relays.item);
  const { system } = useEventPublisher();

  useEffect(() => {
    if (relays) {
      updateRelayConnections(system, relays).catch(console.error);
    }
  }, [relays]);
}

export async function updateRelayConnections(system: SystemInterface, relays: Record<string, RelaySettings>) {
  if (import.meta.env.VITE_SINGLE_RELAY) {
    system.ConnectToRelay(import.meta.env.VITE_SINGLE_RELAY, { read: true, write: true });
  } else {
    for (const [k, v] of Object.entries(relays)) {
      // note: don't awit this, causes race condition with sending requests to relays
      system.ConnectToRelay(k, v);
    }
    for (const [k, v] of system.pool) {
      if (!relays[k] && !v.Ephemeral) {
        system.DisconnectRelay(k);
      }
    }
  }
}
