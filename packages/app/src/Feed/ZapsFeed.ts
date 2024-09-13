import { EventKind, NostrLink, parseZap, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useZapsFeed(link?: NostrLink) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`zaps:${link?.encode()}`);
    if (link) {
      b.withFilter().kinds([EventKind.ZapReceipt]).replyToLink([link]);
    }
    return b;
  }, [link]);

  const zapsFeed = useRequestBuilder(sub);

  const zaps = useMemo(() => {
    if (zapsFeed) {
      const parsedZaps = zapsFeed.map(a => parseZap(a)).filter(z => z.valid);
      return parsedZaps.sort((a, b) => b.amount - a.amount);
    }
    return [];
  }, [zapsFeed]);

  return zaps;
}
