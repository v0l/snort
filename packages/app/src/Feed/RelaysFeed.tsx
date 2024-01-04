import { EventKind, HexKey, parseRelayTags, ReplaceableNoteStore, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useRelaysFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const b = new RequestBuilder(`relays:${pubkey.slice(0, 12)}`);
    b.withFilter().authors([pubkey]).kinds([EventKind.Relays]);
    return b;
  }, [pubkey]);

  const relays = useRequestBuilder(ReplaceableNoteStore, sub);
  return parseRelayTags(relays.data?.tags.filter(a => a[0] === "r") ?? []);
}
