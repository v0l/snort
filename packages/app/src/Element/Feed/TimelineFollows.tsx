import "./Timeline.css";
import { ReactNode, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { FormattedMessage } from "react-intl";
import { EventKind, NostrEvent, NostrLink } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext, useReactions } from "@snort/system-react";

import { dedupeByPubkey, findTag, orderDescending } from "SnortUtils";
import useModeration from "Hooks/useModeration";
import { FollowsFeed } from "Cache";
import { LiveStreams } from "Element/LiveStreams";
import AsyncButton from "../AsyncButton";
import useLogin from "Hooks/useLogin";
import { TimelineRenderer } from "./TimelineFragment";

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

  const filterPosts = useCallback(
    function <T extends NostrEvent>(nts: Array<T>) {
      const a = nts.filter(a => a.kind !== EventKind.LiveEvent);
      return a
        ?.filter(a => (props.postsOnly ? !a.tags.some(b => b[0] === "e" || b[0] === "a") : true))
        .filter(a => !isMuted(a.pubkey) && login.follows.item.includes(a.pubkey) && (props.noteFilter?.(a) ?? true));
    },
    [props.postsOnly, muted, login.follows.timestamp],
  );

  const mainFeed = useMemo(() => {
    return filterPosts((sortedFeed ?? []).filter(a => a.created_at <= latest));
  }, [sortedFeed, filterPosts, latest, login.follows.timestamp]);

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
        frags={[
          {
            events: mainFeed,
          },
        ]}
        related={reactions.data ?? []}
        latest={latestAuthors}
        showLatest={t => onShowLatest(t)}
        noteOnClick={props.noteOnClick}
        noteRenderer={props.noteRenderer}
      />
      <div className="flex items-center p">
        <AsyncButton
          onClick={async () => {
            await FollowsFeed.loadMore(system, login, sortedFeed[sortedFeed.length - 1].created_at);
          }}>
          <FormattedMessage defaultMessage="Load more" />
        </AsyncButton>
      </div>
    </>
  );
};
export default TimelineFollows;
