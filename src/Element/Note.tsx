import "./Note.css";
import { useCallback, useMemo, useState, useLayoutEffect, ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useInView } from "react-intersection-observer";
import { useIntl, FormattedMessage } from "react-intl";

import useEventPublisher from "Feed/EventPublisher";
import Bookmark from "Icons/Bookmark";
import Pin from "Icons/Pin";
import { default as NEvent } from "Nostr/Event";
import ProfileImage from "Element/ProfileImage";
import Text from "Element/Text";
import { eventLink, getReactions, hexToBech32 } from "Util";
import NoteFooter, { Translation } from "Element/NoteFooter";
import NoteTime from "Element/NoteTime";
import EventKind from "Nostr/EventKind";
import { useUserProfiles } from "Feed/ProfileFeed";
import { TaggedRawEvent, u256, HexKey } from "Nostr";
import useModeration from "Hooks/useModeration";
import { setPinned, setBookmarked } from "State/Login";
import type { RootState } from "State/Store";

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
  const ev = useMemo(() => parsedEvent ?? new NEvent(data), [data]);
  const pubKeys = useMemo(() => ev.Thread?.PubKeys || [], [ev]);
  const users = useUserProfiles(pubKeys);
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
    return <Text content={body} tags={ev.Tags} users={users || new Map()} creator={ev.PubKey} />;
  }, [ev]);

  useLayoutEffect(() => {
    if (entry && inView && extendable === false) {
      const h = entry?.target.clientHeight ?? 0;
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
      const u = users?.get(pk);
      const npub = hexToBech32("npub", pk);
      const shortNpub = npub.substring(0, 12);
      if (u) {
        mentions.push({
          pk,
          name: u.name ?? shortNpub,
          link: <Link to={`/p/${npub}`}>{u.name ? `@${u.name}` : shortNpub}</Link>,
        });
      } else {
        mentions.push({
          pk,
          name: shortNpub,
          link: <Link to={`/p/${npub}`}>{shortNpub}</Link>,
        });
      }
    }
    mentions.sort(a => (a.name.startsWith("npub") ? 1 : -1));
    const othersLength = mentions.length - maxMentions;
    const renderMention = (m: { link: React.ReactNode }, idx: number) => {
      return (
        <>
          {idx > 0 && ", "}
          {m.link}
        </>
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
            {pubMentions}
            {others}
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
            <ProfileImage pubkey={ev.RootPubKey} subHeader={replyTag() ?? undefined} />
            {(options.showTime || options.showBookmarked) && (
              <div className="info">
                {options.showBookmarked && (
                  <div className={`saved ${options.canUnbookmark ? "pointer" : ""}`} onClick={() => unbookmark(ev.Id)}>
                    <Bookmark /> <FormattedMessage {...messages.Bookmarked} />
                  </div>
                )}
                {!options.showBookmarked && <NoteTime from={ev.CreatedAt * 1000} />}
              </div>
            )}
            {options.showPinned && (
              <div className={`pinned ${options.canUnpin ? "pointer" : ""}`} onClick={() => unpin(ev.Id)}>
                <Pin /> <FormattedMessage {...messages.Pinned} />
              </div>
            )}
          </div>
        )}
        <div className="body" onClick={e => goToEvent(e, ev.Id)}>
          {transformBody()}
          {translation()}
        </div>
        {extendable && !showMore && (
          <span className="expand-note mt10 flex f-center" onClick={() => setShowMore(true)}>
            <FormattedMessage {...messages.ShowMore} />
          </span>
        )}
        {options.showFooter && <NoteFooter ev={ev} related={related} onTranslated={t => setTranslated(t)} />}
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
