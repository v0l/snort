import { useCallback, useEffect, useMemo, useState } from "react";
import { u256 } from "@snort/nostr";
import { EventKind, Subscriptions } from "@snort/nostr";
import { unixNow, unwrap, tagFilterOfTextRepost } from "Util";
import useSubscription from "Feed/Subscription";
import { useSelector } from "react-redux";
import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";

export interface TimelineFeedOptions {
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  window?: number;
  relay?: string;
}

export interface TimelineSubject {
  type: "pubkey" | "hashtag" | "global" | "ptag" | "post_keyword" | "profile_keyword";
  discriminator: string;
  items: string[];
}

export default function useTimelineFeed(subject: TimelineSubject, options: TimelineFeedOptions) {
  const now = unixNow();
  const [window] = useState<number>(options.window ?? 60 * 60);
  const [until, setUntil] = useState<number>(now);
  const [since, setSince] = useState<number>(now - window);
  const [trackingEvents, setTrackingEvent] = useState<u256[]>([]);
  const [trackingParentEvents, setTrackingParentEvents] = useState<u256[]>([]);
  const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

  const createSub = useCallback(() => {
    if (subject.type !== "global" && subject.items.length === 0) {
      return null;
    }

    const sub = new Subscriptions();
    sub.Id = `timeline:${subject.type}:${subject.discriminator}`;
    if (subject.type === "profile_keyword")
      sub.Kinds = new Set([EventKind.SetMetadata]);
    else
      sub.Kinds = new Set([EventKind.TextNote, EventKind.Repost]);
    switch (subject.type) {
      case "pubkey": {
        sub.Authors = new Set(subject.items);
        break;
      }
      case "hashtag": {
        sub.HashTags = new Set(subject.items);
        break;
      }
      case "ptag": {
        sub.PTags = new Set(subject.items);
        break;
      }
      case "profile_keyword": {
        sub.Search = subject.items[0] + " sort:popular";
        break;
      }
      case "post_keyword": {
        sub.Search = subject.items[0];
        break;
      }
    }
    return sub;
  }, [subject.type, subject.items, subject.discriminator, options.relay]);

  const sub = useMemo(() => {
    const sub = createSub();
    if (sub) {
      if (options.method === "LIMIT_UNTIL") {
        sub.Until = until;
        sub.Limit = subject.type === "profile_keyword" ? 100 : 10;
      } else {
        sub.Since = since;
        sub.Until = until;
        if (since === undefined) {
          sub.Limit = 50;
        }
      }

      if (pref.autoShowLatest) {
        // copy properties of main sub but with limit 0
        // this will put latest directly into main feed
        const latestSub = new Subscriptions();
        latestSub.Authors = sub.Authors;
        latestSub.HashTags = sub.HashTags;
        latestSub.PTags = sub.PTags;
        latestSub.Kinds = sub.Kinds;
        latestSub.Search = sub.Search;
        latestSub.Limit = 1;
        latestSub.Since = Math.floor(new Date().getTime() / 1000);
        sub.AddSubscription(latestSub);
      }
    }
    return sub;
  }, [until, since, options.method, pref, createSub, subject.type]);

  const main = useSubscription(sub, { leaveOpen: true, cache: subject.type !== "global", relay: options.relay });

  const subRealtime = useMemo(() => {
    const subLatest = createSub();
    if (subLatest && !pref.autoShowLatest && subject.type != "profile_keyword") {
      subLatest.Id = `${subLatest.Id}:latest`;
      subLatest.Limit = 1;
      subLatest.Since = Math.floor(new Date().getTime() / 1000);
    }
    return subLatest;
  }, [pref, createSub, subject.type]);

  const latest = useSubscription(subRealtime, {
    leaveOpen: true,
    cache: false,
    relay: options.relay,
  });

  useEffect(() => {
    // clear store if chaning relays
    main.clear();
    latest.clear();
  }, [options.relay]);

  const subNext = useMemo(() => {
    let sub: Subscriptions | undefined;
    if (trackingEvents.length > 0) {
      sub = new Subscriptions();
      sub.Id = `timeline-related:${subject.type}`;
      sub.Kinds = new Set(
        pref.enableReactions ? [EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt] : [EventKind.ZapReceipt]
      );
      sub.ETags = new Set(trackingEvents);
    }
    return sub ?? null;
  }, [trackingEvents, pref, subject.type]);

  const others = useSubscription(subNext, { leaveOpen: true, cache: subject.type !== "global", relay: options.relay });

  const subParents = useMemo(() => {
    if (trackingParentEvents.length > 0) {
      const parents = new Subscriptions();
      parents.Id = `timeline-parent:${subject.type}`;
      parents.Ids = new Set(trackingParentEvents);
      return parents;
    }
    return null;
  }, [trackingParentEvents, subject.type]);

  const parent = useSubscription(subParents, { leaveOpen: false, cache: false, relay: options.relay });

  useEffect(() => {
    if (main.store.notes.length > 0) {
      setTrackingEvent(s => {
        const ids = main.store.notes.map(a => a.id);
        if (ids.some(a => !s.includes(a))) {
          return Array.from(new Set([...s, ...ids]));
        }
        return s;
      });
      const repostsByKind6 = main.store.notes
        .filter(a => a.kind === EventKind.Repost && a.content === "")
        .map(a => a.tags.find(b => b[0] === "e"))
        .filter(a => a)
        .map(a => unwrap(a)[1]);
      const repostsByKind1 = main.store.notes
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
  }, [main.store]);

  return {
    main: main.store,
    related: others.store,
    latest: latest.store,
    parent: parent.store,
    loadMore: () => {
      console.debug("Timeline load more!");
      if (options.method === "LIMIT_UNTIL") {
        const oldest = main.store.notes.reduce((acc, v) => (acc = v.created_at < acc ? v.created_at : acc), unixNow());
        setUntil(oldest);
      } else {
        setUntil(s => s - window);
        setSince(s => s - window);
      }
    },
    showLatest: () => {
      main.append(latest.store.notes);
      latest.clear();
    },
  };
}
