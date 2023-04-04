import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { u256, EventKind } from "@snort/nostr";

import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";
import { appendDedupe, NostrLink } from "Util";
import { FlatNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";

export default function useThreadFeed(link: NostrLink) {
  const [trackingEvents, setTrackingEvent] = useState<u256[]>([link.id]);
  const [allEvents, setAllEvents] = useState<u256[]>([link.id]);
  const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

  const sub = useMemo(() => {
    const sub = new RequestBuilder(`thread:${link.id.substring(0, 8)}`);
    sub.withOptions({
      leaveOpen: true,
    });
    sub.withFilter().ids(trackingEvents);
    sub
      .withFilter()
      .kinds(
        pref.enableReactions
          ? [EventKind.Reaction, EventKind.TextNote, EventKind.Repost, EventKind.ZapReceipt]
          : [EventKind.TextNote, EventKind.ZapReceipt]
      )
      .tag("e", allEvents);

    return sub;
  }, [trackingEvents, allEvents, pref, link.id]);

  const store = useRequestBuilder<FlatNoteStore>(FlatNoteStore, sub);

  useEffect(() => {
    if (store.data) {
      const mainNotes = store.data?.filter(a => a.kind === EventKind.TextNote) ?? [];

      const eTags = mainNotes.map(a => a.tags.filter(b => b[0] === "e").map(b => b[1])).flat();
      const eTagsMissing = eTags.filter(a => !mainNotes.some(b => b.id === a));
      setTrackingEvent(s => appendDedupe(s, eTagsMissing));
      setAllEvents(s => appendDedupe(s, eTags));
    }
  }, [store]);

  return store;
}
