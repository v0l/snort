import { useEffect, useMemo, useState } from "react";
import { EventKind, NostrLink, RequestBuilder, NoteCollection } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { useReactions } from "./Reactions";

export default function useThreadFeed(link: NostrLink) {
  const [allEvents, setAllEvents] = useState<Array<NostrLink>>([]);

  const sub = useMemo(() => {
    const sub = new RequestBuilder(`thread:${link.id.slice(0, 12)}`);
    sub.withOptions({
      leaveOpen: true,
    });
    sub.withFilter().link(link);
    sub.withFilter().kinds([EventKind.TextNote]).replyToLink([link, ...allEvents]);
    return sub;
  }, [allEvents.length]);

  const store = useRequestBuilder(NoteCollection, sub);

  useEffect(() => {
    if (store.data) {
      const links = store.data
        .map(a => [
          NostrLink.fromEvent(a),
          ...a.tags.filter(a => a[0] === "e" || a[0] === "a").map(v => NostrLink.fromTag(v)),
        ])
        .flat();
      setAllEvents(links);
    }
  }, [store.data?.length]);

  const reactions = useReactions(`thread:${link.id.slice(0, 12)}:reactions`, [link, ...allEvents]);

  return {
    thread: store.data ?? [],
    reactions: reactions.data ?? [],
  };
}
