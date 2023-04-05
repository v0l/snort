import "./Note.css";
import React, { useCallback, useMemo, useState, useLayoutEffect, ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useInView } from "react-intersection-observer";
import { useIntl, FormattedMessage } from "react-intl";
import { TaggedRawEvent, HexKey, EventKind, NostrPrefix } from "@snort/nostr";

import useEventPublisher from "Feed/EventPublisher";
import Icon from "Icons/Icon";
import { parseZap } from "Element/Zap";
import ProfileImage from "Element/ProfileImage";
import Text from "Element/Text";
import {
  eventLink,
  getReactions,
  dedupeByPubkey,
  tagFilterOfTextRepost,
  hexToBech32,
  normalizeReaction,
  Reaction,
  profileLink,
} from "Util";
import NoteFooter, { Translation } from "Element/NoteFooter";
import NoteTime from "Element/NoteTime";
import useModeration from "Hooks/useModeration";
import { setPinned, setBookmarked } from "State/Login";
import type { RootState } from "State/Store";
import { UserCache } from "Cache/UserCache";

import messages from "./messages";
import { EventExt } from "System/EventExt";

export interface NoteProps {
  data: TaggedRawEvent;
  className?: string;
  related: readonly TaggedRawEvent[];
  highlight?: boolean;
  ignoreModeration?: boolean;
  options?: {
    showHeader?: boolean;
    showTime?: boolean;
    showPinned?: boolean;
    showBookmarked?: boolean;
    showFooter?: boolean;
    showReactionsLink?: boolean;
    canUnpin?: boolean;
    canUnbookmark?: boolean;
    canClick?: boolean;
  };
}

const HiddenNote = ({ children }: { children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return show ? (
    <>{children}</>
  ) : (
    <div className="card note hidden-note">
      <div className="header">
        <p>
          <FormattedMessage {...messages.MutedAuthor} />
        </p>
        <button onClick={() => setShow(true)}>
          <FormattedMessage {...messages.Show} />
        </button>
      </div>
    </div>
  );
};

export default function Note(props: NoteProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: ev, related, highlight, options: opt, ignoreModeration = false } = props;
  const [showReactions, setShowReactions] = useState(false);
  const deletions = useMemo(() => getReactions(related, ev.id, EventKind.Deletion), [related]);
  const { isMuted } = useModeration();
  const isOpMuted = isMuted(ev?.pubkey);
  const { ref, inView, entry } = useInView({ triggerOnce: true });
  const [extendable, setExtendable] = useState<boolean>(false);
  const [showMore, setShowMore] = useState<boolean>(false);
  const baseClassName = `note card ${props.className ? props.className : ""}`;
  const { pinned, bookmarked } = useSelector((s: RootState) => s.login);
  const publisher = useEventPublisher();
  const [translated, setTranslated] = useState<Translation>();
  const { formatMessage } = useIntl();
  const reactions = useMemo(() => getReactions(related, ev.id, EventKind.Reaction), [related, ev]);
  const groupReactions = useMemo(() => {
    const result = reactions?.reduce(
      (acc, reaction) => {
        const kind = normalizeReaction(reaction.content);
        const rs = acc[kind] || [];
        return { ...acc, [kind]: [...rs, reaction] };
      },
      {
        [Reaction.Positive]: [] as TaggedRawEvent[],
        [Reaction.Negative]: [] as TaggedRawEvent[],
      }
    );
    return {
      [Reaction.Positive]: dedupeByPubkey(result[Reaction.Positive]),
      [Reaction.Negative]: dedupeByPubkey(result[Reaction.Negative]),
    };
  }, [reactions]);
  const positive = groupReactions[Reaction.Positive];
  const negative = groupReactions[Reaction.Negative];
  const reposts = useMemo(
    () =>
      dedupeByPubkey([
        ...getReactions(related, ev.id, EventKind.TextNote).filter(e => e.tags.some(tagFilterOfTextRepost(e, ev.id))),
        ...getReactions(related, ev.id, EventKind.Repost),
      ]),
    [related, ev]
  );
  const zaps = useMemo(() => {
    const sortedZaps = getReactions(related, ev.id, EventKind.ZapReceipt)
      .map(a => parseZap(a, ev))
      .filter(z => z.valid);
    sortedZaps.sort((a, b) => b.amount - a.amount);
    return sortedZaps;
  }, [related]);
  const totalReactions = positive.length + negative.length + reposts.length + zaps.length;

  const options = {
    showHeader: true,
    showTime: true,
    showFooter: true,
    canUnpin: false,
    canUnbookmark: false,
    ...opt,
  };

  async function unpin(id: HexKey) {
    if (options.canUnpin) {
      if (window.confirm(formatMessage(messages.ConfirmUnpin))) {
        const es = pinned.filter(e => e !== id);
        const ev = await publisher.pinned(es);
        publisher.broadcast(ev);
        dispatch(setPinned({ keys: es, createdAt: new Date().getTime() }));
      }
    }
  }

  async function unbookmark(id: HexKey) {
    if (options.canUnbookmark) {
      if (window.confirm(formatMessage(messages.ConfirmUnbookmark))) {
        const es = bookmarked.filter(e => e !== id);
        const ev = await publisher.bookmarked(es);
        publisher.broadcast(ev);
        dispatch(setBookmarked({ keys: es, createdAt: new Date().getTime() }));
      }
    }
  }

  const transformBody = useCallback(() => {
    const body = ev?.content ?? "";
    if (deletions?.length > 0) {
      return (
        <b className="error">
          <FormattedMessage {...messages.Deleted} />
        </b>
      );
    }
    return <Text content={body} tags={ev.tags} creator={ev.pubkey} />;
  }, [ev]);

  useLayoutEffect(() => {
    if (entry && inView && extendable === false) {
      const h = (entry?.target as HTMLDivElement)?.offsetHeight ?? 0;
      if (h > 650) {
        setExtendable(true);
      }
    }
  }, [inView, entry, extendable]);

  function goToEvent(
    e: React.MouseEvent,
    eTarget: TaggedRawEvent,
    isTargetAllowed: boolean = e.target === e.currentTarget
  ) {
    if (!isTargetAllowed || opt?.canClick === false) {
      return;
    }

    e.stopPropagation();
    const link = eventLink(eTarget.id, eTarget.relays);
    // detect cmd key and open in new tab
    if (e.metaKey) {
      window.open(link, "_blank");
    } else {
      navigate(link, {
        state: ev,
      });
    }
  }

  function replyTag() {
    const thread = EventExt.extractThread(ev);
    if (thread === undefined) {
      return undefined;
    }

    const maxMentions = 2;
    const replyId = thread?.replyTo?.Event ?? thread?.root?.Event;
    const replyRelayHints = thread?.replyTo?.Relay ?? thread.root?.Relay;
    const mentions: { pk: string; name: string; link: ReactNode }[] = [];
    for (const pk of thread?.pubKeys ?? []) {
      const u = UserCache.getFromCache(pk);
      const npub = hexToBech32(NostrPrefix.PublicKey, pk);
      const shortNpub = npub.substring(0, 12);
      mentions.push({
        pk,
        name: u?.name ?? shortNpub,
        link: <Link to={profileLink(pk)}>{u?.name ? `@${u.name}` : shortNpub}</Link>,
      });
    }
    mentions.sort(a => (a.name.startsWith(NostrPrefix.PublicKey) ? 1 : -1));
    const othersLength = mentions.length - maxMentions;
    const renderMention = (m: { link: React.ReactNode; pk: string; name: string }, idx: number) => {
      return (
        <React.Fragment key={m.pk}>
          {idx > 0 && ", "}
          {m.link}
        </React.Fragment>
      );
    };
    const pubMentions =
      mentions.length > maxMentions ? mentions?.slice(0, maxMentions).map(renderMention) : mentions?.map(renderMention);
    const others = mentions.length > maxMentions ? formatMessage(messages.Others, { n: othersLength }) : "";
    return (
      <div className="reply">
        re:&nbsp;
        {(mentions?.length ?? 0) > 0 ? (
          <>
            {pubMentions} {others}
          </>
        ) : (
          replyId && (
            <Link to={eventLink(replyId, replyRelayHints)}>
              {hexToBech32(NostrPrefix.Event, replyId)?.substring(0, 12)}
            </Link>
          )
        )}
      </div>
    );
  }

  if (ev.kind !== EventKind.TextNote) {
    return (
      <>
        <h4>
          <FormattedMessage {...messages.UnknownEventKind} values={{ kind: ev.kind }} />
        </h4>
        <pre>{JSON.stringify(ev, undefined, "  ")}</pre>
      </>
    );
  }

  function translation() {
    if (translated && translated.confidence > 0.5) {
      return (
        <>
          <p className="highlight">
            <FormattedMessage {...messages.TranslatedFrom} values={{ lang: translated.fromLanguage }} />
          </p>
          {translated.text}
        </>
      );
    } else if (translated) {
      return (
        <p className="highlight">
          <FormattedMessage {...messages.TranslationFailed} />
        </p>
      );
    }
  }

  function content() {
    if (!inView) return undefined;
    return (
      <>
        {options.showHeader && (
          <div className="header flex">
            <ProfileImage
              autoWidth={false}
              pubkey={ev.pubkey}
              subHeader={replyTag() ?? undefined}
              linkToProfile={opt?.canClick === undefined}
            />
            {(options.showTime || options.showBookmarked) && (
              <div className="info">
                {options.showBookmarked && (
                  <div className={`saved ${options.canUnbookmark ? "pointer" : ""}`} onClick={() => unbookmark(ev.id)}>
                    <Icon name="bookmark" /> <FormattedMessage {...messages.Bookmarked} />
                  </div>
                )}
                {!options.showBookmarked && <NoteTime from={ev.created_at * 1000} />}
              </div>
            )}
            {options.showPinned && (
              <div className={`pinned ${options.canUnpin ? "pointer" : ""}`} onClick={() => unpin(ev.id)}>
                <Icon name="pin" /> <FormattedMessage {...messages.Pinned} />
              </div>
            )}
          </div>
        )}
        <div className="body" onClick={e => goToEvent(e, ev, true)}>
          {transformBody()}
          {translation()}
          {options.showReactionsLink && (
            <div className="reactions-link" onClick={() => setShowReactions(true)}>
              <FormattedMessage {...messages.ReactionsLink} values={{ n: totalReactions }} />
            </div>
          )}
        </div>
        {extendable && !showMore && (
          <span className="expand-note mt10 flex f-center" onClick={() => setShowMore(true)}>
            <FormattedMessage {...messages.ShowMore} />
          </span>
        )}
        {options.showFooter && (
          <NoteFooter
            ev={ev}
            positive={positive}
            negative={negative}
            reposts={reposts}
            zaps={zaps}
            onTranslated={t => setTranslated(t)}
            showReactions={showReactions}
            setShowReactions={setShowReactions}
          />
        )}
      </>
    );
  }

  const note = (
    <div
      className={`${baseClassName}${highlight ? " active " : " "}${extendable && !showMore ? " note-expand" : ""}`}
      onClick={e => goToEvent(e, ev)}
      ref={ref}>
      {content()}
    </div>
  );

  return !ignoreModeration && isOpMuted ? <HiddenNote>{note}</HiddenNote> : note;
}
