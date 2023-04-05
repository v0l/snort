import { useMemo } from "react";
import { HexKey, EventKind } from "@snort/nostr";

import { parseZap } from "Element/Zap";
import { FlatNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";

export default function useZapsFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const b = new RequestBuilder(`zaps:${pubkey.slice(0, 12)}`);
    b.withFilter().tag("p", [pubkey]).kinds([EventKind.ZapReceipt]);
    return b;
  }, [pubkey]);

  const zapsFeed = useRequestBuilder<FlatNoteStore>(FlatNoteStore, sub);

  const zaps = useMemo(() => {
    if (zapsFeed.data) {
      const profileZaps = zapsFeed.data
        .map(a => parseZap(a))
        .filter(z => z.valid && z.receiver === pubkey && z.sender !== pubkey && !z.event);
      profileZaps.sort((a, b) => b.amount - a.amount);
      return profileZaps;
    }
    return [];
  }, [zapsFeed]);

  return zaps;
}
