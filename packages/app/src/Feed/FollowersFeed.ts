import { useMemo } from "react";
import { HexKey, EventKind } from "@snort/nostr";

import { PubkeyReplaceableNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";

export default function useFollowersFeed(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const b = new RequestBuilder(`followers:${pubkey.slice(0, 12)}`);
    b.withFilter().kinds([EventKind.ContactList]).tag("p", [pubkey]);
    return b;
  }, [pubkey]);

  const followersFeed = useRequestBuilder<PubkeyReplaceableNoteStore>(PubkeyReplaceableNoteStore, sub);

  const followers = useMemo(() => {
    const contactLists = followersFeed.data?.filter(
      a => a.kind === EventKind.ContactList && a.tags.some(b => b[0] === "p" && b[1] === pubkey)
    );
    return [...new Set(contactLists?.map(a => a.pubkey))];
  }, [followersFeed, pubkey]);

  return followers;
}
