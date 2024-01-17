import "./Timeline.css";

import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ShowMoreInView } from "@/Components/Event/ShowMore";
import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import { LiveStreams } from "@/Components/LiveStream/LiveStreams";
import useHashtagsFeed from "@/Feed/HashtagsFeed";
import { useFollowsTimelineView } from "@/Feed/WorkerRelayView";
import useHistoryState from "@/Hooks/useHistoryState";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { dedupeByPubkey, findTag, orderDescending } from "@/Utils";

export interface TimelineFollowsProps {
  postsOnly: boolean;
  liveStreams?: boolean;
  noteFilter?: (ev: NostrEvent) => boolean;
  noteRenderer?: (ev: NostrEvent) => ReactNode;
  noteOnClick?: (ev: NostrEvent) => void;
  displayAs?: DisplayAs;
  showDisplayAsSelector?: boolean;
}

/**
 * A list of notes by "subject"
 */
const TimelineFollows = (props: TimelineFollowsProps) => {
  const login = useLogin();
  const displayAsInitial = props.displayAs ?? login.feedDisplayAs ?? "list";
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
  const [latest, setLatest] = useHistoryState(unixNow(), "TimelineFollowsLatest");
  const [limit, setLimit] = useState(50);
  const feed = useFollowsTimelineView(limit);
  const { muted, isEventMuted } = useModeration();

  const sortedFeed = useMemo(() => orderDescending(feed), [feed]);
  const oldest = useMemo(() => sortedFeed.at(-1)?.created_at, [sortedFeed]);

  const postsOnly = useCallback(
    (a: NostrEvent) => (props.postsOnly ? !a.tags.some(b => b[0] === "e" || b[0] === "a") : true),
    [props.postsOnly],
  );

  const filterPosts = useCallback(
    (nts: Array<TaggedNostrEvent>) => {
      const a = nts.filter(a => a.kind !== EventKind.LiveEvent);
      return a
        ?.filter(postsOnly)
        .filter(a => !isEventMuted(a) && login.follows.item.includes(a.pubkey) && (props.noteFilter?.(a) ?? true));
    },
    [postsOnly, muted, login.follows.timestamp],
  );

  const mixin = useHashtagsFeed();
  const mainFeed = useMemo(() => {
    return filterPosts((sortedFeed ?? []).filter(a => a.created_at <= latest));
  }, [sortedFeed, filterPosts, latest, login.follows.timestamp]);

  const findHashTagContext = (a: NostrEvent) => {
    const tag = a.tags.filter(a => a[0] === "t").find(a => login.tags.item.includes(a[1].toLowerCase()))?.[1];
    return tag;
  };
  const mixinFiltered = useMemo(() => {
    const mainFeedIds = new Set(mainFeed.map(a => a.id));
    return (mixin.data ?? [])
      .filter(a => !mainFeedIds.has(a.id) && postsOnly(a) && !isEventMuted(a))
      .filter(a => a.tags.filter(a => a[0] === "t").length < 5)
      .filter(a => !oldest || a.created_at >= oldest)
      .map(
        a =>
          ({
            ...a,
            context: findHashTagContext(a),
          }) as TaggedNostrEvent,
      );
  }, [mixin, mainFeed, postsOnly, isEventMuted]);

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
      <DisplayAsSelector
        show={props.showDisplayAsSelector}
        activeSelection={displayAs}
        onSelect={(displayAs: DisplayAs) => setDisplayAs(displayAs)}
      />
      <TimelineRenderer
        frags={[{ events: orderDescending(mainFeed.concat(mixinFiltered)), refTime: latest }]}
        latest={latestAuthors}
        showLatest={t => onShowLatest(t)}
        noteOnClick={props.noteOnClick}
        noteRenderer={props.noteRenderer}
        noteContext={e => {
          if (typeof e.context === "string") {
            return <Link to={`/t/${e.context}`}>{`#${e.context}`}</Link>;
          }
        }}
        displayAs={displayAs}
      />
      {sortedFeed.length > 0 && (
        <ShowMoreInView onClick={() => {
          setLimit(s => s + 20);
        }} />
      )}
    </>
  );
};

export default TimelineFollows;
