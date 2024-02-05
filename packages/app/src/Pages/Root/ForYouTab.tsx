import {EventKind, NostrEvent} from "@snort/system";
import { memo, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import {Relay} from "@/Cache";
import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import { TaskList } from "@/Components/Tasks/TaskList";
import useTimelineFeed, { TimelineFeedOptions, TimelineSubject } from "@/Feed/TimelineFeed";
import useLogin from "@/Hooks/useLogin";
import messages from "@/Pages/messages";

const FollowsHint = () => {
  const { publicKey: pubKey, follows } = useLogin();
  if (follows.item?.length === 0 && pubKey) {
    return (
      <FormattedMessage
        {...messages.NoFollows}
        values={{
          newUsersPage: (
            <Link to={"/discover"}>
              <FormattedMessage {...messages.NewUsers} />
            </Link>
          ),
        }}
      />
    );
  }
  return null;
};

let forYouFeed = {
  events: [] as NostrEvent[],
  created_at: 0,
};

let getForYouFeedPromise: Promise<NostrEvent[]> | null = null;

export const ForYouTab = memo(function ForYouTab() {
  const [notes, setNotes] = useState<NostrEvent[]>(forYouFeed.events);
  const { feedDisplayAs } = useLogin();
  const displayAsInitial = feedDisplayAs ?? "list";
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
  const { publicKey } = useLogin();

  const login = useLogin();
  const subject = useMemo(
    () =>
      ({
        type: "pubkey",
        items: login.follows.item,
        discriminator: login.publicKey?.slice(0, 12),
        extra: rb => {
          if (login.tags.item.length > 0) {
            rb.withFilter().kinds([EventKind.TextNote]).tag("t", login.tags.item);
          }
        },
      }) as TimelineSubject,
    [login.follows.item, login.tags.item],
  );
  // also get "follows" feed so data is loaded from relays and there's a fallback if "for you" feed is empty
  const latestFeed = useTimelineFeed(subject, { method: "TIME_RANGE" } as TimelineFeedOptions);
  const filteredLatestFeed = useMemo(() => {
    // no replies
    return latestFeed.main?.filter((ev: NostrEvent) => !ev.tags.some((tag: string[]) => tag[0] === "e")) ?? [];
  }, [latestFeed.main]);

  const getFeed = () => {
    if (!publicKey) {
      return [];
    }
    if (!getForYouFeedPromise) {
      getForYouFeedPromise = Relay.forYouFeed(publicKey);
    }
    getForYouFeedPromise!.then(notes => {
      getForYouFeedPromise = null;
      if (notes.length < 10) {
        setTimeout(() => {
          getForYouFeedPromise = Relay.forYouFeed(publicKey);
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
    if (forYouFeed.events.length < 10 || Date.now() - forYouFeed.created_at > 1000 * 60 * 2) {
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
        events: combinedFeed,
        refTime: Date.now(),
      },
    ];
  }, [notes]);

  return (
    <>
      <DisplayAsSelector activeSelection={displayAs} onSelect={a => setDisplayAs(a)} />
      <FollowsHint />
      <TaskList />
      <TimelineRenderer frags={frags} latest={[]} displayAs={displayAs} loadMore={() => latestFeed.loadMore()} />
    </>
  );
});
