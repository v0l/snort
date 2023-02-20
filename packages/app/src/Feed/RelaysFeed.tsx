import { useMemo } from "react";
import { HexKey, FullRelaySettings } from "@snort/nostr";
import { EventKind, Subscriptions } from "@snort/nostr";
import useSubscription from "./Subscription";

export default function useRelaysFeed(pubkey: HexKey) {
  const sub = useMemo(() => {
    const x = new Subscriptions();
    x.Id = `relays:${pubkey.slice(0, 12)}`;
    x.Kinds = new Set([EventKind.ContactList]);
    x.Authors = new Set([pubkey]);
    x.Limit = 1;
    return x;
  }, [pubkey]);

  const relays = useSubscription(sub, { leaveOpen: false, cache: false });
  const eventContent = relays.store.notes[0]?.content;

  if (!eventContent) {
    return [] as FullRelaySettings[];
  }

  try {
    return Object.entries(JSON.parse(eventContent)).map(([url, settings]) => ({
      url,
      settings,
    })) as FullRelaySettings[];
  } catch (error) {
    console.error(error);
    return [] as FullRelaySettings[];
  }
}
