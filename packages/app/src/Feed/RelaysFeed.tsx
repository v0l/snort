import { EventKind, parseRelayTags, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useRelaysFeed(pubkey?: string) {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`relays:${pubkey ?? ""}`);
    if (pubkey) {
      b.withFilter().authors([pubkey]).kinds([EventKind.Relays]);
    }
    return b;
  }, [pubkey]);

  const relays = useRequestBuilder(sub);
  return parseRelayTags(relays[0]?.tags.filter(a => a[0] === "r") ?? []);
}
