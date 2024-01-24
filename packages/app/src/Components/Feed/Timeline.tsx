import "./Timeline.css";

import { unixNow } from "@snort/shared";
import { EventKind, socialGraphInstance, TaggedNostrEvent } from "@snort/system";
import { useCallback, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import { DisplayAs, DisplayAsSelector } from "@/Components/Feed/DisplayAsSelector";
import { TimelineRenderer } from "@/Components/Feed/TimelineRenderer";
import useTimelineFeed, { TimelineFeed, TimelineSubject } from "@/Feed/TimelineFeed";
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
  loadMore?: boolean;
  noSort?: boolean;
  displayAs?: DisplayAs;
  showDisplayAsSelector?: boolean;
}

/**
 * A list of notes by "subject"
 */
const Timeline = (props: TimelineProps) => {
  const login = useLogin();
  const feedOptions = useMemo(() => {
    return {
      method: props.method,
      window: props.window,
      now: props.now,
    };
  }, [props]);
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
      const a = [...nts.filter(a => a.kind !== EventKind.LiveEvent)];
      return a
        ?.filter(a => (props.postsOnly ? !a.tags.some(b => b[0] === "e") : true))
        .filter(a => props.ignoreModeration && checkFollowDistance(a));
    },
    [props.postsOnly, props.ignoreModeration, props.followDistance],
  );

  const mainFeed = useMemo(() => {
    return filterPosts(feed.main ?? []);
  }, [feed, filterPosts]);
  const latestFeed = useMemo(() => {
    return filterPosts(feed.latest ?? []).filter(a => !mainFeed.some(b => b.id === a.id));
  }, [feed, filterPosts]);

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
            refTime: mainFeed.at(0)?.created_at ?? unixNow(),
          },
        ]}
        latest={latestAuthors}
        showLatest={t => onShowLatest(t)}
        displayAs={displayAs}
      />
      {(props.loadMore === undefined || props.loadMore === true) && (
        <div className="flex items-center px-3 py-4">
          <button type="button" onClick={() => feed.loadMore()}>
            <FormattedMessage defaultMessage="Load more" id="00LcfG" />
          </button>
        </div>
      )}
    </>
  );
};
export default Timeline;
