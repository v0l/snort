import { EventKind, NostrEvent, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import { memo, useEffect, useMemo, useState } from "react";
import { useNavigationType } from "react-router-dom";

import { Relay } from "@/Cache";
import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import useTimelineFeed, { TimelineFeedOptions, TimelineSubject } from "@/Feed/TimelineFeed";
import useFollowsControls from "@/Hooks/useFollowControls";
import useHistoryState from "@/Hooks/useHistoryState";
import useLogin from "@/Hooks/useLogin";
import { System } from "@/system";

let forYouFeed = {
  events: [] as NostrEvent[],
  created_at: 0,
};

let getForYouFeedPromise: Promise<NostrEvent[]> | null = null;
let reactionsRequested = false;

const getReactedByFollows = (follows: string[]) => {
  const rb1 = new RequestBuilder("follows:reactions");
  rb1.withFilter().kinds([EventKind.Reaction, EventKind.ZapReceipt]).authors(follows).limit(100);
  const q = System.Query(rb1);
  setTimeout(() => {
    q.cancel();
    const reactedIds = new Set<string>();
    q.snapshot.forEach((ev: TaggedNostrEvent) => {
      const reactedTo = ev.tags.find((t: string[]) => t[0] === "e")?.[1];
      if (reactedTo) {
        reactedIds.add(reactedTo);
      }
    });
    const rb2 = new RequestBuilder("follows:reactedEvents");
    rb2.withFilter().ids(Array.from(reactedIds));
    System.Query(rb2);
  }, 500);
};

export const ForYouTab = memo(function ForYouTab() {
  const [notes, setNotes] = useState<NostrEvent[]>(forYouFeed.events);
  const login = useLogin(s => ({
    feedDisplayAs: s.feedDisplayAs,
    publicKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestSet),
  }));
  const displayAsInitial = login.feedDisplayAs ?? "list";
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
  const navigationType = useNavigationType();
  const [openedAt] = useHistoryState(Math.floor(Date.now() / 1000), "openedAt");
  const { followList } = useFollowsControls();

  if (!reactionsRequested && login.publicKey) {
    reactionsRequested = true;
    // on first load, ask relays for reactions to events by follows
    getReactedByFollows(followList);
  }

  const subject = useMemo(
    () =>
      ({
        type: "pubkey",
        items: followList,
        discriminator: login.publicKey?.slice(0, 12),
        extra: rb => {
          if (login.tags.length > 0) {
            rb.withFilter().kinds([EventKind.TextNote]).tags(login.tags);
          }
        },
      }) as TimelineSubject,
    [login.publicKey, followList, login.tags],
  );
  // also get "follows" feed so data is loaded from relays and there's a fallback if "for you" feed is empty
  const latestFeed = useTimelineFeed(subject, { method: "TIME_RANGE", now: openedAt } as TimelineFeedOptions);
  const filteredLatestFeed = useMemo(() => {
    return (
      latestFeed.main?.filter((ev: NostrEvent) => {
        // no replies
        return !ev.tags.some((tag: string[]) => tag[0] === "e");
      }) ?? []
    );
  }, [latestFeed.main, subject]);

  const getFeed = () => {
    if (!login.publicKey) {
      return [];
    }
    if (!getForYouFeedPromise && Relay instanceof WorkerRelayInterface) {
      getForYouFeedPromise = Relay.forYouFeed(login.publicKey);
    }
    getForYouFeedPromise?.then(notes => {
      getForYouFeedPromise = null;
      if (notes.length < 10) {
        setTimeout(() => {
          if (Relay instanceof WorkerRelayInterface) {
            getForYouFeedPromise = Relay.forYouFeed(login.publicKey!);
          }
        }, 1000);
      }
      forYouFeed = {
        events: notes,
        created_at: Date.now(),
      };
      setNotes(notes);
    });
  };

  useEffect(() => {
    if (
      forYouFeed.events.length < 10 ||
      (navigationType !== "POP" && Date.now() - forYouFeed.created_at > 1000 * 60 * 2)
    ) {
      getFeed();
    }
  }, []);

  const combinedFeed = useMemo(() => {
    const seen = new Set<string>();
    const combined = [];
    let i = 0; // Index for `notes`
    let j = 0; // Index for `latestFeed.main`
    let count = 0; // Combined feed count to decide when to insert from `latestFeed`

    while (i < notes.length || j < (filteredLatestFeed.length ?? 0)) {
      // Insert approximately 1 event from `latestFeed` for every 4 events from `notes`
      if (count % 5 === 0 && j < (filteredLatestFeed.length ?? 0)) {
        const ev = filteredLatestFeed[j];
        if (!seen.has(ev.id) && !ev.tags.some((a: string[]) => a[0] === "e")) {
          seen.add(ev.id);
          combined.push(ev);
        }
        j++;
      } else if (i < notes.length) {
        // Add from `notes` otherwise
        const ev = notes[i];
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          combined.push(ev);
        }
        i++;
      }
      count++;
    }
    return combined;
  }, [notes, filteredLatestFeed]);

  const frags = useMemo(() => {
    return [
      {
        events: combinedFeed as Array<TaggedNostrEvent>,
        refTime: Date.now(),
      },
    ];
  }, [notes]);

  return (
    <>
      <DisplayAsSelector activeSelection={displayAs} onSelect={a => setDisplayAs(a)} />
      <TimelineRenderer
        frags={frags}
        latest={[]}
        displayAs={displayAs}
        loadMore={() => latestFeed.loadMore()}
        showLatest={() => {}}
      />
    </>
  );
});
