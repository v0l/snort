import { EventExt, EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useReactions, useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";

export default function useThreadFeed(link: NostrLink) {
  const [root, setRoot] = useState<NostrLink>();
  const [allEvents, setAllEvents] = useState<Array<NostrLink>>([]);

  const sub = useMemo(() => {
    const sub = new RequestBuilder(`thread:${link.id.slice(0, 12)}`);
    sub.withOptions({
      leaveOpen: true,
    });
    sub.withFilter().link(link);
    if (root) {
      sub.withFilter().link(root);
    }
    const grouped = [link, ...allEvents].reduce(
      (acc, v) => {
        acc[v.type] ??= [];
        acc[v.type].push(v);
        return acc;
      },
      {} as Record<string, Array<NostrLink>>,
    );

    for (const [, v] of Object.entries(grouped)) {
      sub.withFilter().kinds([EventKind.TextNote]).replyToLink(v);
    }
    return sub;
  }, [allEvents.length]);

  const store = useRequestBuilder(sub);

  useEffect(() => {
    if (store.data) {
      const links = store.data
        .map(a => [
          NostrLink.fromEvent(a),
          ...a.tags.filter(a => a[0] === "e" || a[0] === "a").map(v => NostrLink.fromTag(v)),
        ])
        .flat();
      setAllEvents(links);

      const current = store.data.find(a => link.matchesEvent(a));
      if (current) {
        const t = EventExt.extractThread(current);
        if (t) {
          const rootOrReplyAsRoot = t?.root ?? t?.replyTo;
          if (rootOrReplyAsRoot) {
            setRoot(
              NostrLink.fromTag([
                rootOrReplyAsRoot.key,
                rootOrReplyAsRoot.value ?? "",
                rootOrReplyAsRoot.relay ?? "",
                ...(rootOrReplyAsRoot.marker ?? []),
              ]),
            );
          }
        }
      }
    }
  }, [store.data?.length]);

  const reactions = useReactions(`thread:${link.id.slice(0, 12)}:reactions`, [link, ...allEvents]);

  return {
    thread: store.data ?? [],
    reactions: reactions.data ?? [],
  };
}
