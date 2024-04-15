import "./Timeline.css";

import { EventKind, NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import useTimelineFeed, { TimelineFeedOptions, TimelineSubject } from "@/Feed/TimelineFeed";
import useFollowsControls from "@/Hooks/useFollowControls";
import useHistoryState from "@/Hooks/useHistoryState";
import useLogin from "@/Hooks/useLogin";
import { dedupeByPubkey } from "@/Utils";

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
  const [openedAt] = useHistoryState(Math.floor(Date.now() / 1000), "openedAt");
  const { isFollowing, followList } = useFollowsControls();
  const subject = useMemo(
    () =>
      ({
        type: "pubkey",
        items: followList,
        discriminator: login.publicKey?.slice(0, 12),
        extra: rb => {
          if (login.tags.item.length > 0) {
            rb.withFilter().kinds([EventKind.TextNote, EventKind.Repost]).tag("t", login.tags.item);
          }
        },
      }) as TimelineSubject,
    [followList, login.tags.item],
  );
  const feed = useTimelineFeed(subject, { method: "TIME_RANGE", now: openedAt } as TimelineFeedOptions);

  // TODO allow reposts:
  const postsOnly = useCallback(
    (a: NostrEvent) => (props.postsOnly ? !a.tags.some(b => b[0] === "e" || b[0] === "a") : true),
    [props.postsOnly],
  );

  const filterPosts = useCallback(
    (nts: Array<TaggedNostrEvent>) => {
      const a = nts.filter(a => a.kind !== EventKind.LiveEvent);
      return a
        ?.filter(postsOnly)
        .filter(a => props.noteFilter?.(a) ?? true)
        .filter(a => isFollowing(a.pubkey) || a.tags.filter(a => a[0] === "t").length < 5);
    },
    [postsOnly, props.noteFilter, isFollowing],
  );

  const mainFeed = useMemo(() => {
    return filterPosts(feed.main ?? []);
  }, [feed.main, filterPosts]);

  const latestFeed = useMemo(() => {
    return filterPosts(feed.latest ?? []);
  }, [feed.latest]);

  const latestAuthors = useMemo(() => {
    return dedupeByPubkey(latestFeed).map(e => e.pubkey);
  }, [latestFeed]);

  function onShowLatest(scrollToTop = false) {
    feed.showLatest();
    if (scrollToTop) {
      window.scrollTo(0, 0);
    }
  }

  return (
    <>
      <DisplayAsSelector
        show={props.showDisplayAsSelector}
        activeSelection={displayAs}
        onSelect={(displayAs: DisplayAs) => setDisplayAs(displayAs)}
      />
      <TimelineRenderer
        frags={[{ events: mainFeed, refTime: 0 }]}
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
        loadMore={() => feed.loadMore()}
      />
    </>
  );
};

export default TimelineFollows;
