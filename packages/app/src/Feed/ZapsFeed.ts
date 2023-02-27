import { useMemo } from "react";
import { HexKey, EventKind, Subscriptions } from "@snort/nostr";
import { parseZap } from "Element/Zap";
import useSubscription from "./Subscription";

export default function useZapsFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const x = new Subscriptions();
    x.Id = `zaps:${pubkey.slice(0, 12)}`;
    x.Kinds = new Set([EventKind.ZapReceipt]);
    x.PTags = new Set([pubkey]);
    return x;
  }, [pubkey]);

  const zapsFeed = useSubscription(sub, { leaveOpen: false, cache: true });

  const zaps = useMemo(() => {
    const profileZaps = zapsFeed.store.notes
      .map(parseZap)
      .filter(z => z.valid && z.p === pubkey && z.zapper !== pubkey && !z.e);
    profileZaps.sort((a, b) => b.amount - a.amount);
    return profileZaps;
  }, [zapsFeed]);

  return zaps;
}
