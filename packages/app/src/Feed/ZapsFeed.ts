import { useMemo } from "react";
import { EventKind, RequestBuilder, parseZap, NostrLink, NostrPrefix, NoteCollection } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { UserCache } from "Cache";

export default function useZapsFeed(link?: NostrLink) {
  const sub = useMemo(() => {
    if (!link) return null;
    const b = new RequestBuilder(`zaps:${link.encode()}`);
    if (link.type === NostrPrefix.PublicKey) {
      b.withFilter().tag("p", [link.id]).kinds([EventKind.ZapReceipt]);
    } else if (link.type === NostrPrefix.Event || link.type === NostrPrefix.Note) {
      b.withFilter().tag("e", [link.id]).kinds([EventKind.ZapReceipt]);
    }
    return b;
  }, [link]);

  const zapsFeed = useRequestBuilder(NoteCollection, sub);

  const zaps = useMemo(() => {
    if (zapsFeed.data) {
      const profileZaps = zapsFeed.data.map(a => parseZap(a, UserCache)).filter(z => z.valid);
      profileZaps.sort((a, b) => b.amount - a.amount);
      return profileZaps;
    }
    return [];
  }, [zapsFeed]);

  return zaps;
}
