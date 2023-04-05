import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { EventKind, u256 } from "@snort/nostr";

import { unixNow, unwrap, tagFilterOfTextRepost } from "Util";
import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";
import { FlatNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";
import useTimelineWindow from "Hooks/useTimelineWindow";

export interface TimelineFeedOptions {
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  window?: number;
  relay?: string;
  now?: number;
}

export interface TimelineSubject {
  type: "pubkey" | "hashtag" | "global" | "ptag" | "keyword";
  discriminator: string;
  items: string[];
}

export type TimelineFeed = ReturnType<typeof useTimelineFeed>;

export default function useTimelineFeed(subject: TimelineSubject, options: TimelineFeedOptions) {
  const { now, since, until, older, setUntil } = useTimelineWindow({
    window: options.window,
    now: options.now ?? unixNow(),
  });
  const [trackingEvents, setTrackingEvent] = useState<u256[]>([]);
  const [trackingParentEvents, setTrackingParentEvents] = useState<u256[]>([]);
  const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

  const createBuilder = useCallback(() => {
    if (subject.type !== "global" && subject.items.length === 0) {
      return null;
    }

    const b = new RequestBuilder(`timeline:${subject.type}:${subject.discriminator}`);
    const f = b.withFilter().kinds([EventKind.TextNote, EventKind.Repost, EventKind.Polls]);

    if (options.relay) {
      b.withOptions({
        leaveOpen: false,
        relays: [options.relay],
      });
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
      case "keyword": {
        f.search(subject.items[0]);
        break;
      }
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
        rb.filter.until(until).limit(10);
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

  const main = useRequestBuilder<FlatNoteStore>(FlatNoteStore, sub);

  const subRealtime = useMemo(() => {
    const rb = createBuilder();
    if (rb && !pref.autoShowLatest) {
      rb.builder.withOptions({
        leaveOpen: true,
      });
      rb.builder.id = `${rb.builder.id}:latest`;
      rb.filter.limit(1).since(now);
    }
    return rb?.builder ?? null;
  }, [pref.autoShowLatest, createBuilder]);

  const latest = useRequestBuilder<FlatNoteStore>(FlatNoteStore, subRealtime);

  useEffect(() => {
    // clear store if changing relays
    main.clear();
    latest.clear();
  }, [options.relay]);

  const subNext = useMemo(() => {
    const rb = new RequestBuilder(`timeline-related:${subject.type}`);
    if (trackingEvents.length > 0) {
      rb.withFilter()
        .kinds(
          pref.enableReactions ? [EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt] : [EventKind.ZapReceipt]
        )
        .tag("e", trackingEvents);
    }
    if (trackingParentEvents.length > 0) {
      rb.withFilter().ids(trackingParentEvents);
    }
    return rb.numFilters > 0 ? rb : null;
  }, [trackingEvents, pref, subject.type]);

  const related = useRequestBuilder<FlatNoteStore>(FlatNoteStore, subNext);

  useEffect(() => {
    if (main.data && main.data.length > 0) {
      setTrackingEvent(s => {
        const ids = (main.data ?? []).map(a => a.id);
        if (ids.some(a => !s.includes(a))) {
          return Array.from(new Set([...s, ...ids]));
        }
        return s;
      });
      const repostsByKind6 = main.data
        .filter(a => a.kind === EventKind.Repost && a.content === "")
        .map(a => a.tags.find(b => b[0] === "e"))
        .filter(a => a)
        .map(a => unwrap(a)[1]);
      const repostsByKind1 = main.data
        .filter(
          a => (a.kind === EventKind.Repost || a.kind === EventKind.TextNote) && a.tags.some(tagFilterOfTextRepost(a))
        )
        .map(a => a.tags.find(tagFilterOfTextRepost(a)))
        .filter(a => a)
        .map(a => unwrap(a)[1]);
      const reposts = [...repostsByKind6, ...repostsByKind1];
      if (reposts.length > 0) {
        setTrackingParentEvents(s => {
          if (reposts.some(a => !s.includes(a))) {
            const temp = new Set([...s, ...reposts]);
            return Array.from(temp);
          }
          return s;
        });
      }
    }
  }, [main]);

  return {
    main: main.data,
    related: related.data,
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
