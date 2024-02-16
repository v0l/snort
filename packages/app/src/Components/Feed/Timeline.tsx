import "./Timeline.css";

import { socialGraphInstance, TaggedNostrEvent } from "@snort/system";
import { useCallback, useMemo, useState } from "react";

import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import useTimelineFeed, { TimelineFeed, TimelineSubject } from "@/Feed/TimelineFeed";
import useHistoryState from "@/Hooks/useHistoryState";
import useLogin from "@/Hooks/useLogin";
import { dedupeByPubkey } from "@/Utils";

export interface TimelineProps {
  postsOnly: boolean;
  subject: TimelineSubject;
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  followDistance?: number;
  ignoreModeration?: boolean;
  window?: number;
  now?: number;
  noSort?: boolean;
  displayAs?: DisplayAs;
  showDisplayAsSelector?: boolean;
}

/**
 * A list of notes by "subject"
 */
const Timeline = (props: TimelineProps) => {
  const login = useLogin();
  const [openedAt] = useHistoryState(Math.floor(Date.now() / 1000), "openedAt");
  const feedOptions = useMemo(
    () => ({
      method: props.method,
      window: props.window,
      now: props.now ?? openedAt,
    }),
    [props],
  );
  const feed: TimelineFeed = useTimelineFeed(props.subject, feedOptions);
  const displayAsInitial = props.displayAs ?? login.feedDisplayAs ?? "list";
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);

  const filterPosts = useCallback(
    (nts: readonly TaggedNostrEvent[]) => {
      const checkFollowDistance = (a: TaggedNostrEvent) => {
        if (props.followDistance === undefined) {
          return true;
        }
        const followDistance = socialGraphInstance.getFollowDistance(a.pubkey);
        return followDistance === props.followDistance;
      };
      return nts
        ?.filter(a => (props.postsOnly ? !a.tags.some(b => b[0] === "e") : true))
        .filter(a => props.ignoreModeration || checkFollowDistance(a));
    },
    [props.postsOnly, props.ignoreModeration, props.followDistance],
  );

  const mainFeed = useMemo(() => {
    return filterPosts(feed.main ?? []);
  }, [feed.main, filterPosts]);
  const latestFeed = useMemo(() => {
    return filterPosts(feed.latest ?? []).filter(a => !mainFeed.some(b => b.id === a.id));
  }, [feed.latest, feed.main, filterPosts]);

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
        frags={[
          {
            events: mainFeed,
            refTime: 0,
          },
        ]}
        latest={latestAuthors}
        showLatest={t => onShowLatest(t)}
        displayAs={displayAs}
        loadMore={() => feed.loadMore()}
      />
    </>
  );
};
export default Timeline;
