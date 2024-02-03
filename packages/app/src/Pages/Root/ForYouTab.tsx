import {EventKind, TaggedNostrEvent} from "@snort/system";
import { memo, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import { TaskList } from "@/Components/Tasks/TaskList";
import { getForYouFeed } from "@/Db/getForYouFeed";
import useLogin from "@/Hooks/useLogin";
import messages from "@/Pages/messages";
import { System } from "@/system";
import useTimelineFeed, {TimelineFeedOptions, TimelineSubject} from "@/Feed/TimelineFeed";

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
  events: [] as TaggedNostrEvent[],
  created_at: 0,
};

let getForYouFeedPromise: Promise<TaggedNostrEvent[]> | null = null;

export const ForYouTab = memo(function ForYouTab() {
  const [notes, setNotes] = useState<TaggedNostrEvent[]>(forYouFeed.events);
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
  // also get "follows" feed so data is loaded
  const latestFeed = useTimelineFeed(subject, { method: "TIME_RANGE" } as TimelineFeedOptions);

  const getFeed = () => {
    if (!publicKey) {
      return [];
    }
    if (!getForYouFeedPromise) {
      getForYouFeedPromise = getForYouFeed(publicKey);
    }
    getForYouFeedPromise!.then(notes => {
      console.log("for you feed", notes);
      if (notes.length < 10) {
        setTimeout(() => {
          getForYouFeedPromise = null;
          getForYouFeed();
        }, 1000);
      }
      forYouFeed = {
        events: notes,
        created_at: Date.now(),
      };
      setNotes(notes);
      notes.forEach(note => {
        queueMicrotask(() => {
          System.HandleEvent(note);
        });
      });
    });
  };

  useEffect(() => {
    if (forYouFeed.events.length < 10 || Date.now() - forYouFeed.created_at > 1000 * 60 * 1) {
      getFeed();
    }
  }, []);

  const combinedFeed = useMemo(() => {
    // combine feeds: intermittently pick from both feeds
    const seen = new Set<string>();
    const combined = [];
    let i = 0;
    let j = 0;
    while (i < notes.length || j < latestFeed.main?.length) {
      if (i < notes.length) {
        const ev = notes[i];
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          combined.push(ev);
        }
        i++;
      }
      if (j < latestFeed.main?.length) {
        const ev = latestFeed.main[j];
        if (!seen.has(ev.id) && !ev.tags?.some((tag: string[]) => tag[0] === "e")) {
          seen.add(ev.id);
          combined.push(ev);
        }
        j++;
      }
    }
    return combined;
  }, [notes, latestFeed.main]);

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
      <TimelineRenderer frags={frags} latest={[]} displayAs={displayAs} />
    </>
  );
});
