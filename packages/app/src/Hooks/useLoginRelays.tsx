import { useEffect } from "react";
import useLogin from "./useLogin";
import useEventPublisher from "./useEventPublisher";

export function useLoginRelays() {
  const { relays } = useLogin();
  const { system } = useEventPublisher();

  useEffect(() => {
    if (relays) {
      (async () => {
        for (const [k, v] of Object.entries(relays.item)) {
          await system.ConnectToRelay(k, v);
        }
        for (const v of system.Sockets) {
          if (!relays.item[v.address] && !v.ephemeral) {
            system.DisconnectRelay(v.address);
          }
        }
      })();
    }
  }, [relays]);
}
