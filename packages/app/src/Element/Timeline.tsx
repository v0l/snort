import "./Timeline.css";
import { FormattedMessage } from "react-intl";
import { useCallback, useMemo } from "react";
import { useInView } from "react-intersection-observer";

import ArrowUp from "Icons/ArrowUp";
import { dedupeByPubkey } from "Util";
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
  const { main, related, latest, parent, loadMore, showLatest } = useTimelineFeed(subject, {
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
    [postsOnly, muted]
  );

  const mainFeed = useMemo(() => {
    return filterPosts(main.notes);
  }, [main, filterPosts]);

  const latestFeed = useMemo(() => {
    return filterPosts(latest.notes).filter(a => !mainFeed.some(b => b.id === a.id));
  }, [latest, mainFeed, filterPosts]);
  const latestAuthors = useMemo(() => {
    return dedupeByPubkey(latestFeed).map(e => e.pubkey);
  }, [latestFeed]);

  function eventElement(e: TaggedRawEvent) {
    switch (e.kind) {
      case EventKind.SetMetadata: {
        return <ProfilePreview actions={<></>} pubkey={e.pubkey} className="card" />;
      }
      case EventKind.TextNote: {
        const eRef = e.tags.find((a, i) => a[0] === "e" && a[3] === "mention" && e.content === `#[${i}]`)?.at(1);
        if (eRef) {
          return <NoteReaction data={e} key={e.id} root={parent.notes.find(a => a.id === eRef)} />;
        }
        return <Note key={e.id} data={e} related={related.notes} ignoreModeration={ignoreModeration} />;
      }
      case EventKind.ZapReceipt: {
        const zap = parseZap(e);
        return zap.e ? null : <Zap zap={zap} key={e.id} />;
      }
      case EventKind.Reaction:
      case EventKind.Repost: {
        const eRef = e.tags.find(a => a[0] === "e")?.at(1);
        return <NoteReaction data={e} key={e.id} root={parent.notes.find(a => a.id === eRef)} />;
      }
    }
  }

  function onShowLatest(scrollToTop = false) {
    showLatest();
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
            <ArrowUp />
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
              <ArrowUp />
            </div>
          )}
        </>
      )}
      {mainFeed.map(eventElement)}
      <LoadMore onLoadMore={loadMore} shouldLoadMore={main.end}>
        <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
        <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
        <Skeleton width="100%" height="120px" margin="0 0 16px 0" />
      </LoadMore>
    </div>
  );
}
