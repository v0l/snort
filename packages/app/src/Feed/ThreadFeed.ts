import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { u256, EventKind, TaggedRawEvent } from "@snort/nostr";

import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";
import { appendDedupe, debounce } from "Util";
import { RequestBuilder } from "System/RequestBuilder";
import { System } from "System";
import useNoteStore from "Hooks/useNoteStore";

export default function useThreadFeed(id: u256) {
  const [trackingEvents, setTrackingEvent] = useState<u256[]>([id]);
  const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

  const sub = useMemo(() => {
    const sub = new RequestBuilder(`thread:${id.substring(0, 8)}`);
    sub.withFilter().ids(trackingEvents);
    sub
      .withFilter()
      .kinds(
        pref.enableReactions
          ? [EventKind.Reaction, EventKind.TextNote, EventKind.Repost, EventKind.ZapReceipt]
          : [EventKind.TextNote, EventKind.ZapReceipt]
      )
      .tag("e", trackingEvents);

    return sub;
  }, [trackingEvents, pref, id]);

  const q = System.Query(sub);
  const store = useNoteStore(q) as Array<TaggedRawEvent>;

  useEffect(() => {
    if (store) {
      return debounce(500, () => {
        const mainNotes = store.filter(a => a.kind === EventKind.TextNote);

        const eTags = mainNotes
          .filter(a => a.kind === EventKind.TextNote)
          .map(a => a.tags.filter(b => b[0] === "e").map(b => b[1]))
          .flat();
        const eTagsMissing = eTags.filter(a => !mainNotes.some(b => b.id === a));
        setTrackingEvent(s => appendDedupe(s, eTagsMissing));
      });
    }
  }, [store]);

  useEffect(() => {
    return () => System.CancelQuery(sub.id);
  }, []);

  return store;
}
