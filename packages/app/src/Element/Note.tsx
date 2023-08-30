import "./Note.css";
import React, { useMemo, useState, ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { useIntl, FormattedMessage } from "react-intl";
import { TaggedNostrEvent, HexKey, EventKind, NostrPrefix, Lists, EventExt, parseZap } from "@snort/system";

import { System } from "index";
import useEventPublisher from "Feed/EventPublisher";
import Icon from "Icons/Icon";
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
  findTag,
} from "SnortUtils";
import NoteFooter from "Element/NoteFooter";
import NoteTime from "Element/NoteTime";
import Reveal from "Element/Reveal";
import useModeration from "Hooks/useModeration";
import { UserCache } from "Cache";
import Poll from "Element/Poll";
import useLogin from "Hooks/useLogin";
import { setBookmarked, setPinned } from "Login";
import { NostrFileElement } from "Element/NostrFileHeader";
import ZapstrEmbed from "Element/ZapstrEmbed";
import PubkeyList from "Element/PubkeyList";
import { LiveEvent } from "Element/LiveEvent";
import { NoteContextMenu, NoteTranslation } from "Element/NoteContextMenu";
import Reactions from "Element/Reactions";
import { ZapGoal } from "Element/ZapGoal";

import messages from "./messages";

export interface NoteProps {
  data: TaggedNostrEvent;
  className?: string;
  related: readonly TaggedNostrEvent[];
  highlight?: boolean;
  ignoreModeration?: boolean;
  onClick?: (e: TaggedNostrEvent) => void;
  depth?: number;
  searchedValue?: string;
  options?: {
    showHeader?: boolean;
    showContextMenu?: boolean;
    showTime?: boolean;
    showPinned?: boolean;
    showBookmarked?: boolean;
    showFooter?: boolean;
    showReactionsLink?: boolean;
    showMedia?: boolean;
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
  const { data: ev, related, highlight, options: opt, ignoreModeration = false, className } = props;

  if (ev.kind === EventKind.FileHeader) {
    return <NostrFileElement ev={ev} />;
  }
  if (ev.kind === EventKind.ZapstrTrack) {
    return <ZapstrEmbed ev={ev} />;
  }
  if (ev.kind === EventKind.PubkeyLists) {
    return <PubkeyList ev={ev} className={className} />;
  }
  if (ev.kind === EventKind.LiveEvent) {
    return <LiveEvent ev={ev} />;
  }
  if (ev.kind === (9041 as EventKind)) {
    return <ZapGoal ev={ev} />;
  }

  const baseClassName = `note card${className ? ` ${className}` : ""}`;
  const navigate = useNavigate();
  const [showReactions, setShowReactions] = useState(false);
  const deletions = useMemo(() => getReactions(related, ev.id, EventKind.Deletion), [related]);
  const { isMuted } = useModeration();
  const isOpMuted = isMuted(ev?.pubkey);
  const { ref, inView } = useInView({ triggerOnce: true });
  const login = useLogin();
  const { pinned, bookmarked } = login;
  const publisher = useEventPublisher();
  const [translated, setTranslated] = useState<NoteTranslation>();
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
        [Reaction.Positive]: [] as TaggedNostrEvent[],
        [Reaction.Negative]: [] as TaggedNostrEvent[],
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
      .map(a => parseZap(a, UserCache, ev))
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
    showContextMenu: true,
    ...opt,
  };

  async function unpin(id: HexKey) {
    if (options.canUnpin && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnpin))) {
        const es = pinned.item.filter(e => e !== id);
        const ev = await publisher.noteList(es, Lists.Pinned);
        System.BroadcastEvent(ev);
        setPinned(login, es, ev.created_at * 1000);
      }
    }
  }

  async function unbookmark(id: HexKey) {
    if (options.canUnbookmark && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnbookmark))) {
        const es = bookmarked.item.filter(e => e !== id);
        const ev = await publisher.noteList(es, Lists.Bookmarked);
        System.BroadcastEvent(ev);
        setBookmarked(login, es, ev.created_at * 1000);
      }
    }
  }

  const transformBody = () => {
    const body = ev?.content ?? "";
    if (deletions?.length > 0) {
      return (
        <b className="error">
          <FormattedMessage {...messages.Deleted} />
        </b>
      );
    }
    const contentWarning = ev.tags.find(a => a[0] === "content-warning");
    if (contentWarning) {
      return (
        <Reveal
          message={
            <>
              <FormattedMessage defaultMessage="This note has been marked as sensitive, click here to reveal" />
              {contentWarning[1] && (
                <>
                  <br />
                  <FormattedMessage
                    defaultMessage="Reason: {reason}"
                    values={{
                      reason: contentWarning[1],
                    }}
                  />
                </>
              )}
            </>
          }>
          <Text highlighText={props.searchedValue} content={body} tags={ev.tags} creator={ev.pubkey} />
        </Reveal>
      );
    }
    return (
      <Text
        highlighText={props.searchedValue}
        content={body}
        tags={ev.tags}
        creator={ev.pubkey}
        depth={props.depth}
        disableMedia={!(options.showMedia ?? true)}
      />
    );
  };

  function goToEvent(
    e: React.MouseEvent,
    eTarget: TaggedNostrEvent,
    isTargetAllowed: boolean = e.target === e.currentTarget
  ) {
    if (!isTargetAllowed || opt?.canClick === false) {
      return;
    }

    e.stopPropagation();
    if (props.onClick) {
      props.onClick(eTarget);
      return;
    }

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
    const replyId = thread?.replyTo?.value ?? thread?.root?.value;
    const replyRelayHints = thread?.replyTo?.relay ?? thread.root?.relay;
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

  const canRenderAsTextNote = [EventKind.TextNote, EventKind.Polls];
  if (!canRenderAsTextNote.includes(ev.kind)) {
    const alt = findTag(ev, "alt");
    if (alt) {
      return (
        <div className="note-quote">
          <Text content={alt} tags={[]} creator={ev.pubkey} />
        </div>
      );
    } else {
      return (
        <>
          <h4>
            <FormattedMessage {...messages.UnknownEventKind} values={{ kind: ev.kind }} />
          </h4>
          <pre>{JSON.stringify(ev, undefined, "  ")}</pre>
        </>
      );
    }
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

  function pollOptions() {
    if (ev.kind !== EventKind.Polls) return;

    return <Poll ev={ev} zaps={zaps} />;
  }

  function content() {
    if (!inView) return undefined;
    return (
      <>
        {options.showHeader && (
          <div className="header flex">
            <ProfileImage
              pubkey={ev.pubkey}
              subHeader={replyTag() ?? undefined}
              link={opt?.canClick === undefined ? undefined : ""}
            />
            <div className="info">
              {(options.showTime || options.showBookmarked) && (
                <>
                  {options.showBookmarked && (
                    <div
                      className={`saved ${options.canUnbookmark ? "pointer" : ""}`}
                      onClick={() => unbookmark(ev.id)}>
                      <Icon name="bookmark" /> <FormattedMessage {...messages.Bookmarked} />
                    </div>
                  )}
                  {!options.showBookmarked && <NoteTime from={ev.created_at * 1000} />}
                </>
              )}
              {options.showPinned && (
                <div className={`pinned ${options.canUnpin ? "pointer" : ""}`} onClick={() => unpin(ev.id)}>
                  <Icon name="pin" /> <FormattedMessage {...messages.Pinned} />
                </div>
              )}
              {options.showContextMenu && (
                <NoteContextMenu
                  ev={ev}
                  react={async () => {}}
                  onTranslated={t => setTranslated(t)}
                  setShowReactions={setShowReactions}
                />
              )}
            </div>
          </div>
        )}
        <div className="body" onClick={e => goToEvent(e, ev, true)}>
          {transformBody()}
          {translation()}
          {pollOptions()}
          {options.showReactionsLink && (
            <div className="reactions-link" onClick={() => setShowReactions(true)}>
              <FormattedMessage {...messages.ReactionsLink} values={{ n: totalReactions }} />
            </div>
          )}
        </div>
        {options.showFooter && <NoteFooter ev={ev} positive={positive} reposts={reposts} zaps={zaps} />}
        <Reactions
          show={showReactions}
          setShow={setShowReactions}
          positive={positive}
          negative={negative}
          reposts={reposts}
          zaps={zaps}
        />
      </>
    );
  }

  const note = (
    <div className={`${baseClassName}${highlight ? " active " : " "}`} onClick={e => goToEvent(e, ev)} ref={ref}>
      {content()}
    </div>
  );

  return !ignoreModeration && isOpMuted ? <HiddenNote>{note}</HiddenNote> : note;
}
