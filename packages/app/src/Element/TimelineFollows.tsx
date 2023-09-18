import "./Timeline.css";
import { ReactNode, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { FormattedMessage } from "react-intl";
import { TaggedNostrEvent, EventKind, u256, NostrEvent } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext } from "@snort/system-react";
import { useInView } from "react-intersection-observer";

import { dedupeByPubkey, findTag, orderDescending } from "SnortUtils";
import Note from "Element/Note";
import useModeration from "Hooks/useModeration";
import { FollowsFeed } from "Cache";
import { LiveStreams } from "Element/LiveStreams";
import { useReactions } from "Feed/FeedReactions";
import AsyncButton from "./AsyncButton";
import useLogin from "Hooks/useLogin";
import ProfileImage from "Element/ProfileImage";
import Icon from "Icons/Icon";

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
    feed.map(a => a.id),
  );
  const system = useContext(SnortContext);
  const login = useLogin();
  const { muted, isMuted } = useModeration();
  const { ref, inView } = useInView();

  const sortedFeed = useMemo(() => orderDescending(feed), [feed]);

  const filterPosts = useCallback(
    function <T extends NostrEvent>(nts: Array<T>) {
      const a = nts.filter(a => a.kind !== EventKind.LiveEvent);
      return a
        ?.filter(a => (props.postsOnly ? !a.tags.some(b => b[0] === "e") : true))
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

  const relatedFeed = useCallback(
    (id: u256) => {
      return (reactions?.data ?? []).filter(a => findTag(a, "e") === id);
    },
    [reactions],
  );

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
      {latestFeed.length > 0 && (
        <>
          <div className="card latest-notes" onClick={() => onShowLatest()} ref={ref}>
            {latestAuthors.slice(0, 3).map(p => {
              return <ProfileImage pubkey={p} showUsername={false} link={""} showFollowingMark={false} />;
            })}
            <FormattedMessage
              defaultMessage="{n} new {n, plural, =1 {note} other {notes}}"
              values={{ n: latestFeed.length }}
            />
            <Icon name="arrowUp" />
          </div>
          {!inView && (
            <div className="card latest-notes latest-notes-fixed pointer fade-in" onClick={() => onShowLatest(true)}>
              {latestAuthors.slice(0, 3).map(p => {
                return <ProfileImage pubkey={p} showUsername={false} link={""} showFollowingMark={false} />;
              })}
              <FormattedMessage
                defaultMessage="{n} new {n, plural, =1 {note} other {notes}}"
                values={{ n: latestFeed.length }}
              />
              <Icon name="arrowUp" />
            </div>
          )}
        </>
      )}
      {mainFeed.map(
        a =>
          props.noteRenderer?.(a) ?? (
            <Note data={a as TaggedNostrEvent} related={relatedFeed(a.id)} key={a.id} depth={0} onClick={props.noteOnClick} />
          ),
      )}
      <div className="flex f-center p">
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
