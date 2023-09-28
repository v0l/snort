import "./Timeline.css";
import FormattedMessage from "Element/FormattedMessage";
import { useCallback, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { TaggedNostrEvent, EventKind, u256 } from "@snort/system";

import Icon from "Icons/Icon";
import { dedupeByPubkey, findTag } from "SnortUtils";
import ProfileImage from "Element/User/ProfileImage";
import useTimelineFeed, { TimelineFeed, TimelineSubject } from "Feed/TimelineFeed";
import Note from "Element/Event/Note";
import useModeration from "Hooks/useModeration";
import { LiveStreams } from "Element/LiveStreams";

export interface TimelineProps {
  postsOnly: boolean;
  subject: TimelineSubject;
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  ignoreModeration?: boolean;
  window?: number;
  now?: number;
  loadMore?: boolean;
  noSort?: boolean;
}

/**
 * A list of notes by "subject"
 */
const Timeline = (props: TimelineProps) => {
  const feedOptions = useMemo(() => {
    return {
      method: props.method,
      window: props.window,
      now: props.now,
    };
  }, [props]);
  const feed: TimelineFeed = useTimelineFeed(props.subject, feedOptions);

  const { muted, isMuted } = useModeration();
  const { ref, inView } = useInView();

  const filterPosts = useCallback(
    (nts: readonly TaggedNostrEvent[]) => {
      const a = [...nts.filter(a => a.kind !== EventKind.LiveEvent)];
      props.noSort || a.sort((a, b) => b.created_at - a.created_at);
      return a
        ?.filter(a => (props.postsOnly ? !a.tags.some(b => b[0] === "e") : true))
        .filter(a => props.ignoreModeration || !isMuted(a.pubkey));
    },
    [props.postsOnly, muted, props.ignoreModeration],
  );

  const mainFeed = useMemo(() => {
    return filterPosts(feed.main ?? []);
  }, [feed, filterPosts]);
  const latestFeed = useMemo(() => {
    return filterPosts(feed.latest ?? []).filter(a => !mainFeed.some(b => b.id === a.id));
  }, [feed, filterPosts]);
  const relatedFeed = useCallback(
    (id: u256) => {
      return (feed.related ?? []).filter(a => findTag(a, "e") === id);
    },
    [feed.related],
  );
  const liveStreams = useMemo(() => {
    return (feed.main ?? []).filter(a => a.kind === EventKind.LiveEvent && findTag(a, "status") === "live");
  }, [feed]);

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
      <LiveStreams evs={liveStreams} />
      {latestFeed.length > 0 && (
        <>
          <div className="card latest-notes" onClick={() => onShowLatest()} ref={ref}>
            {latestAuthors.slice(0, 3).map(p => {
              return <ProfileImage pubkey={p} showUsername={false} link={""} />;
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
                return <ProfileImage pubkey={p} showUsername={false} link={""} />;
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
      {mainFeed.map(e => (
        <Note key={e.id} data={e} related={relatedFeed(e.id)} ignoreModeration={props.ignoreModeration} depth={0} />
      ))}
      {(props.loadMore === undefined || props.loadMore === true) && (
        <div className="flex f-center">
          <button type="button" onClick={() => feed.loadMore()}>
            <FormattedMessage defaultMessage="Load more" />
          </button>
        </div>
      )}
    </>
  );
};
export default Timeline;
