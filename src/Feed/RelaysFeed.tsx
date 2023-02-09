import { useMemo } from "react";
import { HexKey } from "Nostr";
import EventKind from "Nostr/EventKind";
import { RelaySpec } from "Element/Relays";
import { Subscriptions } from "Nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useRelaysFeed(pubkey: HexKey) {
  const sub = useMemo(() => {
    const x = new Subscriptions();
    x.Id = `relays:${pubkey.slice(0, 12)}`;
    x.Kinds = new Set([EventKind.Relays]);
    x.Authors = new Set([pubkey]);
    x.Limit = 1;
    return x;
  }, [pubkey]);

  const relays = useSubscription(sub, { leaveOpen: false, cache: true });
  const notes = relays.store.notes;
  const tags = notes.slice(-1)[0]?.tags || [];
  return tags.reduce((rs, tag) => {
    const [t, url, ...settings] = tag;
    if (t === "r") {
      return [
        ...rs,
        {
          url,
          settings: {
            read: settings.includes("read"),
            write: settings.includes("write"),
          },
        },
      ];
    }
    return rs;
  }, [] as RelaySpec[]);
}
