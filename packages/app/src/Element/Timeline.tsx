import "./Timeline.css";
import { FormattedMessage } from "react-intl";
import { useCallback, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";

import Icon from "Icons/Icon";
import { dedupeById, dedupeByPubkey, tagFilterOfTextRepost } from "Util";
import ProfileImage from "Element/ProfileImage";
import useTimelineFeed, { TimelineSubject } from "Feed/TimelineFeed";
import { TaggedRawEvent } from "@snort/nostr";
import { EventKind } from "@snort/nostr";
import LoadMore from "Element/LoadMore";
import Zap, { parseZap } from "Element/Zap";
import Note from "Element/Note";
import NoteReaction from "Element/NoteReaction";
import useModeration from "Hooks/useModeration";
import ProfilePreview from "./ProfilePreview";
import Skeleton from "Element/Skeleton";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "State/Store";
import { setTimeline } from "State/Cache";

export interface TimelineProps {
  postsOnly: boolean;
  subject: TimelineSubject;
  method: "TIME_RANGE" | "LIMIT_UNTIL";
  ignoreModeration?: boolean;
  window?: number;
  relay?: string;
}

/**
 * A list of notes by pubkeys
 */
export default function Timeline({
  subject,
  postsOnly = false,
  method,
  ignoreModeration = false,
  window: timeWindow,
  relay,
}: TimelineProps) {
  const { muted, isMuted } = useModeration();
  const dispatch = useDispatch();
  const cache = useSelector((s: RootState) => s.cache.timeline);
  const feed = useTimelineFeed(subject, {
    method,
    window: timeWindow,
    relay,
  });
  const { ref, inView } = useInView();

  const filterPosts = useCallback(
    (nts: TaggedRawEvent[]) => {
      return [...nts]
        .sort((a, b) => b.created_at - a.created_at)
        ?.filter(a => (postsOnly ? !a.tags.some(b => b[0] === "e") : true))
        .filter(a => ignoreModeration || !isMuted(a.pubkey));
    },
    [postsOnly, muted, ignoreModeration]
  );

  const mainFeed = useMemo(() => {
    return filterPosts(cache.main);
  }, [cache, filterPosts]);

  const latestFeed = useMemo(() => {
    return filterPosts(cache.latest).filter(a => !mainFeed.some(b => b.id === a.id));
  }, [cache, filterPosts]);
  const latestAuthors = useMemo(() => {
    return dedupeByPubkey(latestFeed).map(e => e.pubkey);
  }, [latestFeed]);

  useEffect(() => {
    const key = `${subject.type}-${subject.discriminator}`;
    const newFeed = key !== cache.key;
    dispatch(
      setTimeline({
        key: key,
        main: dedupeById([...(newFeed ? [] : cache.main), ...feed.main.notes]),
        latest: [...feed.latest.notes],
        related: dedupeById([...(newFeed ? [] : cache.related), ...feed.related.notes]),
        parent: dedupeById([...(newFeed ? [] : cache.parent), ...feed.parent.notes]),
      })
    );
  }, [feed.main, feed.latest, feed.related, feed.parent]);

  function eventElement(e: TaggedRawEvent) {
    switch (e.kind) {
      case EventKind.SetMetadata: {
        return <ProfilePreview actions={<></>} pubkey={e.pubkey} className="card" />;
      }
      case EventKind.TextNote: {
        const eRef = e.tags.find(tagFilterOfTextRepost(e))?.at(1);
        if (eRef) {
          return <NoteReaction data={e} key={e.id} root={cache.parent.find(a => a.id === eRef)} />;
        }
        return <Note key={e.id} data={e} related={cache.related} ignoreModeration={ignoreModeration} />;
      }
      case EventKind.ZapReceipt: {
        const zap = parseZap(e);
        return zap.event ? null : <Zap zap={zap} key={e.id} />;
      }
      case EventKind.Reaction:
      case EventKind.Repost: {
        const eRef = e.tags.find(a => a[0] === "e")?.at(1);
        return <NoteReaction data={e} key={e.id} root={cache.parent.find(a => a.id === eRef)} />;
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
      <LoadMore onLoadMore={feed.loadMore} shouldLoadMore={feed.main.end}>
        <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
        <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
        <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
      </LoadMore>
    </div>
  );
}
