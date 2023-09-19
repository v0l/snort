import { useCallback, useEffect, useMemo } from "react";
import { EventKind, NoteCollection, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { unixNow } from "@snort/shared";

import useTimelineWindow from "Hooks/useTimelineWindow";
import useLogin from "Hooks/useLogin";
import { SearchRelays } from "Const";

export interface TimelineFeedOptions {
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  window?: number;
  now?: number;
}

export interface TimelineSubject {
  type: "pubkey" | "hashtag" | "global" | "ptag" | "post_keyword" | "profile_keyword";
  discriminator: string;
  items: string[];
  relay?: string;
  streams?: boolean;
}

export type TimelineFeed = ReturnType<typeof useTimelineFeed>;

export default function useTimelineFeed(subject: TimelineSubject, options: TimelineFeedOptions) {
  const { now, since, until, older, setUntil } = useTimelineWindow({
    window: options.window,
    now: options.now ?? unixNow(),
  });
  const pref = useLogin().preferences;

  const createBuilder = useCallback(() => {
    if (subject.type !== "global" && subject.items.length === 0) {
      return null;
    }

    const b = new RequestBuilder(`timeline:${subject.type}:${subject.discriminator}`);
    const f = b
      .withFilter()
      .kinds(
        subject.type === "profile_keyword"
          ? [EventKind.SetMetadata]
          : [EventKind.TextNote, EventKind.Repost, EventKind.Polls],
      );

    if (subject.relay) {
      f.relay(subject.relay);
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
        f.search(subject.items[0] + " sort:popular");
        SearchRelays.forEach(r => f.relay(r));
        break;
      }
      case "post_keyword": {
        f.search(subject.items[0]);
        SearchRelays.forEach(r => f.relay(r));
        break;
      }
    }
    if (subject.streams && subject.type === "pubkey") {
      b.withFilter()
        .kinds([EventKind.LiveEvent])
        .authors(subject.items)
        .since(now - 60 * 60 * 24);
      b.withFilter().kinds([EventKind.LiveEvent]).tag("p", subject.items);
    }
    return {
      builder: b,
      filter: f,
    };
  }, [subject.type, subject.items, subject.discriminator]);

  const sub = useMemo(() => {
    const rb = createBuilder();
    if (rb) {
      if (options.method === "LIMIT_UNTIL") {
        rb.filter.until(until).limit(200);
      } else {
        rb.filter.since(since).until(until);
        if (since === undefined) {
          rb.filter.limit(50);
        }
      }

      if (pref.autoShowLatest) {
        // copy properties of main sub but with limit 0
        // this will put latest directly into main feed
        rb.builder
          .withOptions({
            leaveOpen: true,
          })
          .withFilter()
          .authors(rb.filter.filter.authors)
          .kinds(rb.filter.filter.kinds)
          .tag("p", rb.filter.filter["#p"])
          .tag("t", rb.filter.filter["#t"])
          .search(rb.filter.filter.search)
          .limit(1)
          .since(now);
      }
    }
    return rb?.builder ?? null;
  }, [until, since, options.method, pref, createBuilder]);

  const main = useRequestBuilder(NoteCollection, sub);

  const subRealtime = useMemo(() => {
    const rb = createBuilder();
    if (rb && !pref.autoShowLatest && options.method !== "LIMIT_UNTIL") {
      rb.builder.withOptions({
        leaveOpen: true,
      });
      rb.builder.id = `${rb.builder.id}:latest`;
      rb.filter.limit(1).since(now);
    }
    return rb?.builder ?? null;
  }, [pref.autoShowLatest, createBuilder]);

  const latest = useRequestBuilder(NoteCollection, subRealtime);

  useEffect(() => {
    // clear store if changing relays
    main.clear();
    latest.clear();
  }, [subject.relay]);

  return {
    main: main.data,
    related: [],
    latest: latest.data,
    loading: main.loading(),
    loadMore: () => {
      if (main.data) {
        console.debug("Timeline load more!");
        if (options.method === "LIMIT_UNTIL") {
          const oldest = main.data.reduce((acc, v) => (acc = v.created_at < acc ? v.created_at : acc), unixNow());
          setUntil(oldest);
        } else {
          older();
        }
      }
    },
    showLatest: () => {
      if (latest.data) {
        main.add(latest.data);
        latest.clear();
      }
    },
  };
}
