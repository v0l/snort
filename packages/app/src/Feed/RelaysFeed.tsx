import { useMemo } from "react";
import { HexKey, FullRelaySettings, EventKind, RequestBuilder, ReplaceableNoteStore } from "@snort/system";

import useRequestBuilder from "Hooks/useRequestBuilder";

export default function useRelaysFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const b = new RequestBuilder(`relays:${pubkey.slice(0, 12)}`);
    b.withFilter().authors([pubkey]).kinds([EventKind.ContactList]);
    return b;
  }, [pubkey]);

  const relays = useRequestBuilder<ReplaceableNoteStore>(ReplaceableNoteStore, sub);

  if (!relays.data?.content) {
    return [] as FullRelaySettings[];
  }

  try {
    return Object.entries(JSON.parse(relays.data.content)).map(([url, settings]) => ({
      url,
      settings,
    })) as FullRelaySettings[];
  } catch (error) {
    console.error(error);
    return [] as FullRelaySettings[];
  }
}
