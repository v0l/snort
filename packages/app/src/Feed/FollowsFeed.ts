import { useMemo } from "react";
import { useSelector } from "react-redux";
import { HexKey, TaggedRawEvent, EventKind, Subscriptions } from "@snort/nostr";

import useSubscription from "Feed/Subscription";
import { RootState } from "State/Store";

export default function useFollowsFeed(pubkey?: HexKey) {
  const { publicKey, follows } = useSelector((s: RootState) => s.login);
  const isMe = publicKey === pubkey;

  const sub = useMemo(() => {
    if (isMe || !pubkey) return null;
    const x = new Subscriptions();
    x.Id = `follows:${pubkey.slice(0, 12)}`;
    x.Kinds = new Set([EventKind.ContactList]);
    x.Authors = new Set([pubkey]);
    return x;
  }, [isMe, pubkey]);

  const contactFeed = useSubscription(sub, { leaveOpen: false, cache: true });
  return useMemo(() => {
    if (isMe) {
      return follows;
    }

    return getFollowing(contactFeed.store.notes ?? [], pubkey);
  }, [contactFeed.store, follows, pubkey]);
}

export function getFollowing(notes: TaggedRawEvent[], pubkey?: HexKey) {
  const contactLists = notes.filter(a => a.kind === EventKind.ContactList && a.pubkey === pubkey);
  const pTags = contactLists?.map(a => a.tags.filter(b => b[0] === "p").map(c => c[1]));
  return [...new Set(pTags?.flat())];
}
