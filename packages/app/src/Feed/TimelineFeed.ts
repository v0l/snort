import { unixNow } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilderAdvanced } from "@snort/system-react";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import useModeration from "@/Hooks/useModeration";
import usePreferences from "@/Hooks/usePreferences";
import useTimelineWindow from "@/Hooks/useTimelineWindow";
import { SearchRelays } from "@/Utils/Const";

export interface TimelineFeedOptions {
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  window?: number;
  now?: number;
}

export interface TimelineSubject {
  type: "pubkey" | "hashtag" | "global" | "ptag" | "post_keyword" | "profile_keyword";
  discriminator: string;
  items: string[];
  relay?: Array<string>;
  extra?: (rb: RequestBuilder) => void;
  kinds?: EventKind[];
}

export type TimelineFeed = ReturnType<typeof useTimelineFeed>;

export default function useTimelineFeed(subject: TimelineSubject, options: TimelineFeedOptions) {
  const { now, since, until, older, setUntil } = useTimelineWindow({
    window: options.window,
    now: options.now ?? unixNow(),
  });
  const autoShowLatest = usePreferences(s => s.autoShowLatest);
  const { isEventMuted } = useModeration();

  const createBuilder = useCallback(() => {
    const kinds =
      subject.kinds ??
      (subject.type === "profile_keyword"
        ? [EventKind.SetMetadata]
        : [EventKind.TextNote, EventKind.Repost, EventKind.Polls]);

    const b = new RequestBuilder(`timeline:${subject.type}:${subject.discriminator}`);
    const f = b.withFilter().kinds(kinds);

    if (subject.relay) {
      subject.relay.forEach(r => f.relay(r));
    }
    switch (subject.type) {
      case "pubkey": {
        f.authors(subject.items);
        break;
      }
      case "hashtag": {
        f.tag("t", subject.items);
        break;
      }
      case "ptag": {
        f.tag("p", subject.items);
        break;
      }
      case "profile_keyword": {
        f.search(subject.items[0]);
        SearchRelays.forEach(r => f.relay(r));
        break;
      }
      case "post_keyword": {
        f.search(subject.items[0]);
        SearchRelays.forEach(r => f.relay(r));
        break;
      }
    }
    subject.extra?.(b);
    return b;
  }, [subject]);

  const sub = useMemo(() => {
    const rb = createBuilder();
    for (const filter of rb.filterBuilders) {
      if (options.method === "LIMIT_UNTIL") {
        filter.until(until).limit(50);
      } else {
        filter.since(since).until(until);
        if (since === undefined) {
          filter.limit(50);
        }
      }
    }
    return rb;
  }, [until, since, options.method, createBuilder]);

  const mainQuery = useRequestBuilderAdvanced(sub);
  const main = useSyncExternalStore(
    h => {
      mainQuery.uncancel();
      mainQuery.on("event", h);
      mainQuery.start();
      return () => {
        mainQuery.flush();
        mainQuery.cancel();
        mainQuery.off("event", h);
      };
    },
    () => mainQuery?.snapshot,
  );

  const subRealtime = useMemo(() => {
    const rb = createBuilder();
    rb.id = `${rb.id}:latest`;
    rb.withOptions({
      leaveOpen: true,
    });
    for (const filter of rb.filterBuilders) {
      filter.limit(1).since(now);
    }
    return rb;
  }, [autoShowLatest, createBuilder]);

  const latestQuery = useRequestBuilderAdvanced(subRealtime);
  const latest = useSyncExternalStore(
    h => {
      latestQuery.uncancel();
      latestQuery.on("event", h);
      latestQuery.start();
      return () => {
        latestQuery.flush();
        latestQuery.cancel();
        latestQuery.off("event", h);
      };
    },
    () => latestQuery?.snapshot,
  );

  return {
    main: main?.filter(a => !isEventMuted(a)),
    latest: latest?.filter(a => !isEventMuted(a)),
    loadMore: () => {
      if (main) {
        console.debug("Timeline load more!");
        if (options.method === "LIMIT_UNTIL") {
          const oldest = main.reduce((acc, v) => (acc = v.created_at < acc ? v.created_at : acc), unixNow());
          setUntil(oldest);
        } else {
          older();
        }
      }
    },
    showLatest: () => {
      if (latest) {
        mainQuery?.feed.add(latest);
        latestQuery?.feed.clear();
      }
    },
  };
}
