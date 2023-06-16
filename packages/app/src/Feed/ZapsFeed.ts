import { useMemo } from "react";
import { HexKey, EventKind, FlatNoteStore, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { parseZap } from "Element/Zap";
import { System } from "index";

export default function useZapsFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const b = new RequestBuilder(`zaps:${pubkey.slice(0, 12)}`);
    b.withFilter().tag("p", [pubkey]).kinds([EventKind.ZapReceipt]);
    return b;
  }, [pubkey]);

  const zapsFeed = useRequestBuilder<FlatNoteStore>(System, FlatNoteStore, sub);

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
