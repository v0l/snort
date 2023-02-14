import { useMemo } from "react";
import { HexKey } from "@snort/nostr";
import { EventKind, Subscriptions } from "@snort/nostr";
import useSubscription from "Feed/Subscription";

export default function useFollowersFeed(pubkey: HexKey) {
  const sub = useMemo(() => {
    const x = new Subscriptions();
    x.Id = `followers:${pubkey.slice(0, 12)}`;
    x.Kinds = new Set([EventKind.ContactList]);
    x.PTags = new Set([pubkey]);

    return x;
  }, [pubkey]);

  const followersFeed = useSubscription(sub, { leaveOpen: false, cache: true });

  const followers = useMemo(() => {
    const contactLists = followersFeed?.store.notes.filter(
      a => a.kind === EventKind.ContactList && a.tags.some(b => b[0] === "p" && b[1] === pubkey)
    );
    return [...new Set(contactLists?.map(a => a.pubkey))];
  }, [followersFeed, pubkey]);

  return followers;
}
