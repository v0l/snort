import "./Note.css";
import React, { useCallback, useMemo, useState, useLayoutEffect, ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useInView } from "react-intersection-observer";
import { useIntl, FormattedMessage } from "react-intl";

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
import { TaggedRawEvent, u256, HexKey, Event as NEvent, EventKind } from "@snort/nostr";
import useModeration from "Hooks/useModeration";
import { setPinned, setBookmarked } from "State/Login";
import type { RootState } from "State/Store";
import { UserCache } from "State/Users/UserCache";

import messages from "./messages";

export interface NoteProps {
  data?: TaggedRawEvent;
  className?: string;
  related: TaggedRawEvent[];
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
  };
  ["data-ev"]?: NEvent;
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
  const { data, related, highlight, options: opt, ["data-ev"]: parsedEvent, ignoreModeration = false } = props;
  const [showReactions, setShowReactions] = useState(false);
  const ev = useMemo(() => parsedEvent ?? new NEvent(data), [data]);
  const deletions = useMemo(() => getReactions(related, ev.Id, EventKind.Deletion), [related]);
  const { isMuted } = useModeration();
  const isOpMuted = isMuted(ev.PubKey);
  const { ref, inView, entry } = useInView({ triggerOnce: true });
  const [extendable, setExtendable] = useState<boolean>(false);
  const [showMore, setShowMore] = useState<boolean>(false);
  const baseClassName = `note card ${props.className ? props.className : ""}`;
  const { pinned, bookmarked } = useSelector((s: RootState) => s.login);
  const publisher = useEventPublisher();
  const [translated, setTranslated] = useState<Translation>();
  const { formatMessage } = useIntl();
  const reactions = useMemo(() => getReactions(related, ev.Id, EventKind.Reaction), [related, ev]);
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
        ...getReactions(related, ev.Id, EventKind.TextNote).filter(e => e.tags.some(tagFilterOfTextRepost(e, ev.Id))),
        ...getReactions(related, ev.Id, EventKind.Repost),
      ]),
    [related, ev]
  );
  const zaps = useMemo(() => {
    const sortedZaps = getReactions(related, ev.Id, EventKind.ZapReceipt)
      .map(parseZap)
      .filter(z => z.valid && z.zapper !== ev.PubKey);
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
    const body = ev?.Content ?? "";
    if (deletions?.length > 0) {
      return (
        <b className="error">
          <FormattedMessage {...messages.Deleted} />
        </b>
      );
    }
    return <Text content={body} tags={ev.Tags} creator={ev.PubKey} />;
  }, [ev]);

  useLayoutEffect(() => {
    if (entry && inView && extendable === false) {
      const h = (entry?.target as HTMLDivElement)?.offsetHeight ?? 0;
      if (h > 650) {
        setExtendable(true);
      }
    }
  }, [inView, entry, extendable]);

  function goToEvent(e: React.MouseEvent, id: u256) {
    e.stopPropagation();
    navigate(eventLink(id));
  }

  function replyTag() {
    if (ev.Thread === null) {
      return null;
    }

    const maxMentions = 2;
    const replyId = ev.Thread?.ReplyTo?.Event ?? ev.Thread?.Root?.Event;
    const mentions: { pk: string; name: string; link: ReactNode }[] = [];
    for (const pk of ev.Thread?.PubKeys ?? []) {
      const u = UserCache.get(pk);
      const npub = hexToBech32("npub", pk);
      const shortNpub = npub.substring(0, 12);
      mentions.push({
        pk,
        name: u?.name ?? shortNpub,
        link: <Link to={profileLink(pk)}>{u?.name ? `@${u.name}` : shortNpub}</Link>,
      });
    }
    mentions.sort(a => (a.name.startsWith("npub") ? 1 : -1));
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
          replyId && <Link to={eventLink(replyId)}>{hexToBech32("note", replyId)?.substring(0, 12)}</Link>
        )}
      </div>
    );
  }

  if (ev.Kind !== EventKind.TextNote) {
    return (
      <>
        <h4>
          <FormattedMessage {...messages.UnknownEventKind} values={{ kind: ev.Kind }} />
        </h4>
        <pre>{JSON.stringify(ev.ToObject(), undefined, "  ")}</pre>
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
    if (!inView) return null;
    return (
      <>
        {options.showHeader && (
          <div className="header flex">
            <ProfileImage autoWidth={false} pubkey={ev.RootPubKey} subHeader={replyTag() ?? undefined} />
            {(options.showTime || options.showBookmarked) && (
              <div className="info">
                {options.showBookmarked && (
                  <div className={`saved ${options.canUnbookmark ? "pointer" : ""}`} onClick={() => unbookmark(ev.Id)}>
                    <Icon name="bookmark" /> <FormattedMessage {...messages.Bookmarked} />
                  </div>
                )}
                {!options.showBookmarked && <NoteTime from={ev.CreatedAt * 1000} />}
              </div>
            )}
            {options.showPinned && (
              <div className={`pinned ${options.canUnpin ? "pointer" : ""}`} onClick={() => unpin(ev.Id)}>
                <Icon name="pin" /> <FormattedMessage {...messages.Pinned} />
              </div>
            )}
          </div>
        )}
        <div className="body" onClick={e => goToEvent(e, ev.Id)}>
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
      ref={ref}>
      {content()}
    </div>
  );

  return !ignoreModeration && isOpMuted ? <HiddenNote>{note}</HiddenNote> : note;
}
