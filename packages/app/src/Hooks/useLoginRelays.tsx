import { System } from "index";
import { useEffect } from "react";
import useLogin from "./useLogin";

export function useLoginRelays() {
  const { relays } = useLogin();

  useEffect(() => {
    if (relays) {
      (async () => {
        for (const [k, v] of Object.entries(relays.item)) {
          await System.ConnectToRelay(k, v);
        }
        for (const v of System.Sockets) {
          if (!relays.item[v.address] && !v.ephemeral) {
            System.DisconnectRelay(v.address);
          }
        }
      })();
    }
  }, [relays]);
}
