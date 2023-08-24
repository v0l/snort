import "./Timeline.css";
import { FormattedMessage } from "react-intl";
import { useCallback, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { TaggedNostrEvent, EventKind, u256, parseZap } from "@snort/system";

import Icon from "Icons/Icon";
import { dedupeByPubkey, findTag, tagFilterOfTextRepost } from "SnortUtils";
import ProfileImage from "Element/ProfileImage";
import useTimelineFeed, { TimelineFeed, TimelineSubject } from "Feed/TimelineFeed";
import Zap from "Element/Zap";
import Note from "Element/Note";
import NoteReaction from "Element/NoteReaction";
import useModeration from "Hooks/useModeration";
import ProfilePreview from "Element/ProfilePreview";
import { UserCache } from "Cache";
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
 * A list of notes by pubkeys
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
    [props.postsOnly, muted, props.ignoreModeration]
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
    [feed.related]
  );
  const liveStreams = useMemo(() => {
    return (feed.main ?? []).filter(a => a.kind === EventKind.LiveEvent && findTag(a, "status") === "live");
  }, [feed]);

  const findRelated = useCallback(
    (id?: u256) => {
      if (!id) return undefined;
      return (feed.related ?? []).find(a => a.id === id);
    },
    [feed.related]
  );
  const latestAuthors = useMemo(() => {
    return dedupeByPubkey(latestFeed).map(e => e.pubkey);
  }, [latestFeed]);

  function eventElement(e: TaggedNostrEvent) {
    switch (e.kind) {
      case EventKind.SetMetadata: {
        return <ProfilePreview actions={<></>} pubkey={e.pubkey} className="card" />;
      }
      case EventKind.Polls:
      case EventKind.TextNote: {
        const eRef = e.tags.find(tagFilterOfTextRepost(e))?.at(1);
        if (eRef) {
          return <NoteReaction data={e} key={e.id} root={findRelated(eRef)} />;
        }
        return (
          <Note key={e.id} data={e} related={relatedFeed(e.id)} ignoreModeration={props.ignoreModeration} depth={0} />
        );
      }
      case EventKind.ZapReceipt: {
        const zap = parseZap(e, UserCache);
        return zap.event ? null : <Zap zap={zap} key={e.id} />;
      }
      case EventKind.Reaction:
      case EventKind.Repost: {
        const eRef = findTag(e, "e");
        return <NoteReaction data={e} key={e.id} root={findRelated(eRef)} />;
      }
    }
  }

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
      {mainFeed.map(eventElement)}
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
