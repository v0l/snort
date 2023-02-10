import { useMemo } from "react";
import { useSelector } from "react-redux";

import { getNewest } from "Util";
import { HexKey, Lists } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import useSubscription from "Feed/Subscription";
import { RootState } from "State/Store";

export default function usePinnedFeed(pubkey: HexKey) {
  const pref = useSelector((s: RootState) => s.login.preferences);
  const { publicKey, pinned: pinnedNotes } = useSelector((s: RootState) => s.login);
  const isMe = publicKey === pubkey;

  const sub = useMemo(() => {
    if (isMe) return null;
    const sub = new Subscriptions();
    sub.Id = `pinned:${pubkey.slice(0, 12)}`;
    sub.Kinds = new Set([EventKind.NoteLists]);
    sub.Authors = new Set([pubkey]);
    sub.DTags = new Set([Lists.Pinned]);
    sub.Limit = 1;
    return sub;
  }, [pubkey]);

  const { store } = useSubscription(sub, { leaveOpen: true, cache: true });
  const etags = useMemo(() => {
    if (isMe) return pinnedNotes;
    const newest = getNewest(store.notes);
    if (newest) {
      const { tags } = newest;
      return tags.filter(t => t[0] === "e").map(t => t[1]);
    }
    return [];
  }, [store.notes, isMe]);

  const subRelated = useMemo(() => {
    let sub: Subscriptions | undefined;
    if (etags.length > 0 && pref.enableReactions) {
      sub = new Subscriptions();
      sub.Id = `pinned-related`;
      sub.Kinds = new Set([EventKind.Reaction, EventKind.Repost, EventKind.Deletion, EventKind.ZapReceipt]);
      sub.ETags = new Set(etags);
    }
    return sub ?? null;
  }, [etags, pref]);

  const esub = useMemo(() => {
    const s = new Subscriptions();
    s.Id = `pinned-notes:${pubkey.slice(0, 12)}`;
    s.Kinds = new Set([EventKind.TextNote]);
    s.Ids = new Set(etags);
    return s;
  }, [etags]);

  const pinnedSub = useSubscription(esub, { leaveOpen: true, cache: true });
  const relatedSub = useSubscription(subRelated, { leaveOpen: true, cache: true });

  const pinned = pinnedSub.store.notes;
  const related = relatedSub.store.notes;

  return { pinned, related };
}
