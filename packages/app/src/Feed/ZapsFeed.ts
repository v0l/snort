import { EventKind, NostrLink, parseZap, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useZapsFeed(link?: NostrLink) {
  const sub = useMemo(() => {
    if (!link) return null;
    const b = new RequestBuilder(`zaps:${link.encode()}`);
    b.withFilter().kinds([EventKind.ZapReceipt]).replyToLink([link]);
    return b;
  }, [link]);

  const zapsFeed = useRequestBuilder(sub);

  const zaps = useMemo(() => {
    if (zapsFeed) {
      const profileZaps = zapsFeed.map(a => parseZap(a)).filter(z => z.valid);
      profileZaps.sort((a, b) => b.amount - a.amount);
      return profileZaps;
    }
    return [];
  }, [zapsFeed]);

  return zaps;
}
