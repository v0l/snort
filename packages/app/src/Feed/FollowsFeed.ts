import { useMemo } from "react";
import { useSelector } from "react-redux";
import { HexKey, TaggedRawEvent, EventKind } from "@snort/nostr";

import { RootState } from "State/Store";
import { PubkeyReplaceableNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";

export default function useFollowsFeed(pubkey?: HexKey) {
  const { publicKey, follows } = useSelector((s: RootState) => s.login);
  const isMe = publicKey === pubkey;

  const sub = useMemo(() => {
    if (isMe || !pubkey) return null;
    const b = new RequestBuilder(`follows:${pubkey.slice(0, 12)}`);
    b.withFilter().kinds([EventKind.ContactList]).authors([pubkey]);
    return b;
  }, [isMe, pubkey]);

  const contactFeed = useRequestBuilder<PubkeyReplaceableNoteStore>(PubkeyReplaceableNoteStore, sub);
  return useMemo(() => {
    if (isMe) {
      return follows;
    }

    return getFollowing(contactFeed.data ?? [], pubkey);
  }, [contactFeed, follows, pubkey]);
}

export function getFollowing(notes: readonly TaggedRawEvent[], pubkey?: HexKey) {
  const contactLists = notes.filter(a => a.kind === EventKind.ContactList && a.pubkey === pubkey);
  const pTags = contactLists?.map(a => a.tags.filter(b => b[0] === "p").map(c => c[1]));
  return [...new Set(pTags?.flat())];
}
