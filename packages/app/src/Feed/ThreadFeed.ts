import { useEffect, useMemo, useState } from "react";
import { u256, EventKind } from "@snort/nostr";

import { appendDedupe, NostrLink } from "Util";
import { FlatNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";
import useLogin from "Hooks/useLogin";

export default function useThreadFeed(link: NostrLink) {
  const [trackingEvents, setTrackingEvent] = useState<u256[]>([link.id]);
  const [allEvents, setAllEvents] = useState<u256[]>([link.id]);
  const pref = useLogin().preferences;

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
      const mainNotes = store.data?.filter(a => a.kind === EventKind.TextNote || a.kind === EventKind.Polls) ?? [];

      const eTags = mainNotes.map(a => a.tags.filter(b => b[0] === "e").map(b => b[1])).flat();
      const eTagsMissing = eTags.filter(a => !mainNotes.some(b => b.id === a));
      setTrackingEvent(s => appendDedupe(s, eTagsMissing));
      setAllEvents(s => appendDedupe(s, eTags));
    }
  }, [store]);

  return store;
}
