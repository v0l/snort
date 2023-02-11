import { useMemo } from "react";
import { HexKey } from "@snort/nostr";
import { EventKind, Subscriptions } from "@snort/nostr";
import useSubscription from "./Subscription";

export default function useZapsFeed(pubkey: HexKey) {
  const sub = useMemo(() => {
    const x = new Subscriptions();
    x.Id = `zaps:${pubkey.slice(0, 12)}`;
    x.Kinds = new Set([EventKind.ZapReceipt]);
    x.PTags = new Set([pubkey]);
    return x;
  }, [pubkey]);

  return useSubscription(sub, { leaveOpen: true, cache: true });
}
