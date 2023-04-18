import "./Timeline.css";
import { FormattedMessage } from "react-intl";
import { useCallback, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { TaggedRawEvent, EventKind, u256 } from "@snort/nostr";

import Icon from "Icons/Icon";
import { dedupeByPubkey, findTag, tagFilterOfTextRepost } from "Util";
import ProfileImage from "Element/ProfileImage";
import useTimelineFeed, { TimelineFeed, TimelineSubject } from "Feed/TimelineFeed";
import LoadMore from "Element/LoadMore";
import Zap, { parseZap } from "Element/Zap";
import Note from "Element/Note";
import NoteReaction from "Element/NoteReaction";
import useModeration from "Hooks/useModeration";
import ProfilePreview from "Element/ProfilePreview";
import Skeleton from "Element/Skeleton";

export interface TimelineProps {
  postsOnly: boolean;
  subject: TimelineSubject;
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  ignoreModeration?: boolean;
  window?: number;
  relay?: string;
  now?: number;
  loadMore?: boolean;
}

/**
 * A list of notes by pubkeys
 */
const Timeline = (props: TimelineProps) => {
  const feedOptions = useMemo(() => {
    return {
      method: props.method,
      window: props.window,
      relay: props.relay,
      now: props.now,
    };
  }, [props]);
  const feed: TimelineFeed = useTimelineFeed(props.subject, feedOptions);

  const { muted, isMuted } = useModeration();
  const { ref, inView } = useInView();

  const filterPosts = useCallback(
    (nts: readonly TaggedRawEvent[]) => {
      return [...nts]
        .sort((a, b) => b.created_at - a.created_at)
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

  function eventElement(e: TaggedRawEvent) {
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
        return <Note key={e.id} data={e} related={relatedFeed(e.id)} ignoreModeration={props.ignoreModeration} />;
      }
      case EventKind.ZapReceipt: {
        const zap = parseZap(e);
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
    <div className="main-content">
      {latestFeed.length > 0 && (
        <>
          <div className="card latest-notes pointer" onClick={() => onShowLatest()} ref={ref}>
            {latestAuthors.slice(0, 3).map(p => {
              return <ProfileImage pubkey={p} showUsername={false} linkToProfile={false} />;
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
                return <ProfileImage pubkey={p} showUsername={false} linkToProfile={false} />;
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
        <LoadMore onLoadMore={feed.loadMore} shouldLoadMore={!feed.loading}>
          <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
          <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
          <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
        </LoadMore>
      )}
    </div>
  );
};
export default Timeline;
