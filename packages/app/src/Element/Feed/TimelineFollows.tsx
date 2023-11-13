import "./Timeline.css";
import { ReactNode, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext, useReactions } from "@snort/system-react";

import { dedupeByPubkey, findTag, orderDescending } from "SnortUtils";
import useModeration from "Hooks/useModeration";
import { FollowsFeed } from "Cache";
import { LiveStreams } from "Element/LiveStreams";
import useLogin from "Hooks/useLogin";
import { TimelineFragment, TimelineRenderer } from "./TimelineFragment";
import useHashtagsFeed from "Feed/HashtagsFeed";
import { ShowMoreInView } from "Element/Event/ShowMore";
import { HashTagHeader } from "Pages/HashTagsPage";

export interface TimelineFollowsProps {
  postsOnly: boolean;
  liveStreams?: boolean;
  noteFilter?: (ev: NostrEvent) => boolean;
  noteRenderer?: (ev: NostrEvent) => ReactNode;
  noteOnClick?: (ev: NostrEvent) => void;
}

/**
 * A list of notes by "subject"
 */
const TimelineFollows = (props: TimelineFollowsProps) => {
  const [latest, setLatest] = useState(unixNow());
  const feed = useSyncExternalStore(
    cb => FollowsFeed.hook(cb, "*"),
    () => FollowsFeed.snapshot(),
  );
  const reactions = useReactions(
    "follows-feed-reactions",
    feed.map(a => NostrLink.fromEvent(a)),
    undefined,
    true,
  );
  const system = useContext(SnortContext);
  const login = useLogin();
  const { muted, isMuted } = useModeration();

  const sortedFeed = useMemo(() => orderDescending(feed), [feed]);

  const postsOnly = useCallback(
    (a: NostrEvent) => (props.postsOnly ? !a.tags.some(b => b[0] === "e" || b[0] === "a") : true),
    [props.postsOnly],
  );

  const filterPosts = useCallback(
    function <T extends NostrEvent>(nts: Array<T>) {
      const a = nts.filter(a => a.kind !== EventKind.LiveEvent);
      return a
        ?.filter(postsOnly)
        .filter(a => !isMuted(a.pubkey) && login.follows.item.includes(a.pubkey) && (props.noteFilter?.(a) ?? true));
    },
    [postsOnly, muted, login.follows.timestamp],
  );

  const mixin = useHashtagsFeed();
  const mainFeed = useMemo(() => {
    return filterPosts((sortedFeed ?? []).filter(a => a.created_at <= latest));
  }, [sortedFeed, filterPosts, latest, login.follows.timestamp, mixin]);

  const hashTagsGroups = useMemo(() => {
    const mainFeedIds = new Set(mainFeed.map(a => a.id));
    const included = new Set<string>();
    return (mixin.data.data ?? [])
      .filter(a => !mainFeedIds.has(a.id) && postsOnly(a))
      .filter(a => a.tags.filter(a => a[0] === "t").length < 5)
      .reduce(
        (acc, v) => {
          if (included.has(v.id)) return acc;
          const tags = v.tags
            .filter(a => a[0] === "t")
            .map(v => v[1].toLocaleLowerCase())
            .filter(a => mixin.hashtags.includes(a));
          for (const t of tags) {
            acc[t] ??= [];
            acc[t].push(v);
            break;
          }
          included.add(v.id);
          return acc;
        },
        {} as Record<string, Array<TaggedNostrEvent>>,
      );
  }, [mixin, mainFeed, postsOnly]);

  const latestFeed = useMemo(() => {
    return filterPosts((sortedFeed ?? []).filter(a => a.created_at > latest));
  }, [sortedFeed, latest]);

  const liveStreams = useMemo(() => {
    return (sortedFeed ?? []).filter(a => a.kind === EventKind.LiveEvent && findTag(a, "status") === "live");
  }, [sortedFeed]);

  const latestAuthors = useMemo(() => {
    return dedupeByPubkey(latestFeed).map(e => e.pubkey);
  }, [latestFeed]);

  function onShowLatest(scrollToTop = false) {
    setLatest(unixNow());
    if (scrollToTop) {
      window.scrollTo(0, 0);
    }
  }

  return (
    <>
      {(props.liveStreams ?? true) && <LiveStreams evs={liveStreams} />}
      <TimelineRenderer
        frags={weaveTimeline(mainFeed, hashTagsGroups)}
        related={reactions.data ?? []}
        latest={latestAuthors}
        showLatest={t => onShowLatest(t)}
        noteOnClick={props.noteOnClick}
        noteRenderer={props.noteRenderer}
      />
      {sortedFeed.length > 0 && <ShowMoreInView
        onClick={async () => await FollowsFeed.loadMore(system, login, sortedFeed[sortedFeed.length - 1].created_at)}
      />}
    </>
  );
};
export default TimelineFollows;

function weaveTimeline(
  main: Array<TaggedNostrEvent>,
  hashtags: Record<string, Array<TaggedNostrEvent>>,
): Array<TimelineFragment> {
  // always skip 5 posts from start to avoid heavy handed weaving
  let skip = 5;

  if (main.length < skip) {
    skip = Math.min(skip, main.length - 1);
  }

  const frags = Object.entries(hashtags).map(([k, v]) => {
    const take = v.slice(0, 5);
    return {
      title: (
        <div className="bb p">
          <HashTagHeader tag={k} />
        </div>
      ),
      events: take,
      refTime: Math.min(
        main.at(skip)?.created_at ?? unixNow(),
        take.reduce((acc, v) => (acc > v.created_at ? acc : v.created_at), 0),
      ),
    } as TimelineFragment;
  });

  if (main.length === 0) {
    return frags;
  }

  return [
    {
      events: main.slice(0, skip),
      refTime: main[0].created_at,
    },
    ...frags,
    {
      events: main.slice(skip),
      refTime: main[skip].created_at,
    },
  ].sort((a, b) => (a.refTime > b.refTime ? -1 : 1));
}