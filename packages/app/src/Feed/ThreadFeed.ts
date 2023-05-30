import { useEffect, useMemo, useState } from "react";
import { u256, EventKind } from "System";

import { appendDedupe, NostrLink } from "SnortUtils";
import { FlatNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";
import useLogin from "Hooks/useLogin";

interface RelayTaggedEventId {
  id: u256;
  relay?: string;
}
export default function useThreadFeed(link: NostrLink) {
  const linkTagged = {
    id: link.id,
    relay: link.relays?.[0],
  };
  const [trackingEvents, setTrackingEvent] = useState<Array<RelayTaggedEventId>>([linkTagged]);
  const [trackingATags, setTrackingATags] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState<Array<RelayTaggedEventId>>([linkTagged]);
  const pref = useLogin().preferences;

  const sub = useMemo(() => {
    const sub = new RequestBuilder(`thread:${link.id.substring(0, 8)}`);
    sub.withOptions({
      leaveOpen: true,
    });
    const fTracking = sub.withFilter();
    for (const te of trackingEvents) {
      fTracking.id(te.id, te.relay);
    }
    sub
      .withFilter()
      .kinds(
        pref.enableReactions
          ? [EventKind.Reaction, EventKind.TextNote, EventKind.Repost, EventKind.ZapReceipt]
          : [EventKind.TextNote, EventKind.ZapReceipt, EventKind.Repost]
      )
      .tag(
        "e",
        allEvents.map(a => a.id)
      );

    if (trackingATags.length > 0) {
      const parsed = trackingATags.map(a => a.split(":"));
      sub
        .withFilter()
        .kinds(parsed.map(a => Number(a[0])))
        .authors(parsed.map(a => a[1]))
        .tag(
          "d",
          parsed.map(a => a[2])
        );
    }
    return sub;
  }, [trackingEvents, trackingATags, allEvents, pref]);

  const store = useRequestBuilder<FlatNoteStore>(FlatNoteStore, sub);

  useEffect(() => {
    setTrackingATags([]);
    setTrackingEvent([linkTagged]);
    setAllEvents([linkTagged]);
  }, [link.id]);

  useEffect(() => {
    if (store.data) {
      const mainNotes = store.data?.filter(a => a.kind === EventKind.TextNote || a.kind === EventKind.Polls) ?? [];

      const eTags = mainNotes
        .map(a =>
          a.tags
            .filter(b => b[0] === "e")
            .map(b => {
              return {
                id: b[1],
                relay: b[2],
              };
            })
        )
        .flat();
      const eTagsMissing = eTags.filter(a => !mainNotes.some(b => b.id === a.id));
      setTrackingEvent(s => appendDedupe(s, eTagsMissing));
      setAllEvents(s => appendDedupe(s, eTags));

      const aTags = mainNotes.map(a => a.tags.filter(b => b[0] === "a").map(b => b[1])).flat();
      setTrackingATags(s => appendDedupe(s, aTags));
    }
  }, [store]);

  return store;
}
