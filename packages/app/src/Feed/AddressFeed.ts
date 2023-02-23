import { useMemo } from "react";
import { HexKey, EventKind, Subscriptions } from "@snort/nostr";
import useSubscription from "Feed/Subscription";
import { getNewest } from "Util";

export default function useAddressFeed(d?: string, pubkey?: HexKey, kind?: EventKind) {
  const sub = useMemo(() => {
    if (d && pubkey && kind) {
      const x = new Subscriptions();
      x.Id = `addr:${kind}:${pubkey.slice(0, 4)}:${d}`;
      x.Kinds = new Set([kind]);
      x.Authors = new Set([pubkey]);
      x.DTags = new Set([d]);
      x.Limit = 1;
      return x;
    }
    return null;
  }, [d, pubkey, kind]);

  const main = useSubscription(sub, { leaveOpen: true, cache: false });

  const note = useMemo(() => {
    return getNewest(
      main.store.notes.filter(
        n => n.kind === kind && n.pubkey === pubkey && n.tags.find(t => t[0] === "d")?.at(1) === d
      )
    );
  }, [main.store, d, pubkey, kind]);

  return note;
}
