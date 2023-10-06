import { Link, useNavigate } from "react-router-dom";
import React, { ReactNode, useMemo, useState } from "react";
import {
  dedupeByPubkey,
  findTag,
  getReactions,
  hexToBech32,
  normalizeReaction,
  profileLink,
  Reaction,
  tagFilterOfTextRepost,
} from "../../SnortUtils";
import useModeration from "../../Hooks/useModeration";
import { useInView } from "react-intersection-observer";
import useLogin from "../../Hooks/useLogin";
import useEventPublisher from "../../Hooks/useEventPublisher";
import { NoteContextMenu, NoteTranslation } from "./NoteContextMenu";
import { FormattedMessage, useIntl } from "react-intl";
import { UserCache } from "../../Cache";
import messages from "../messages";
import { System } from "../../index";
import { setBookmarked, setPinned } from "../../Login";
import Text from "../Text";
import { ProxyImg } from "../ProxyImg";
import Reveal from "./Reveal";
import Poll from "./Poll";
import ProfileImage from "../User/ProfileImage";
import Icon from "../../Icons/Icon";
import NoteTime from "./NoteTime";
import NoteFooter from "./NoteFooter";
import Reactions from "./Reactions";
import HiddenNote from "./HiddenNote";
import { NoteProps } from "./Note";
import { EventExt, EventKind, HexKey, Lists, NostrLink, NostrPrefix, parseZap, TaggedNostrEvent } from "@snort/system";

export function NoteInner(props: NoteProps) {
  const { data: ev, related, highlight, options: opt, ignoreModeration = false, className } = props;

  const baseClassName = `note card${className ? ` ${className}` : ""}`;
  const navigate = useNavigate();
  const [showReactions, setShowReactions] = useState(false);
  const deletions = useMemo(() => getReactions(related, ev.id, EventKind.Deletion), [related]);
  const { isEventMuted } = useModeration();
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
      },
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
    [related, ev],
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

  const innerContent = () => {
    if (ev.kind === EventKind.LongFormTextNote) {
      const title = findTag(ev, "title");
      const summary = findTag(ev, "simmary");
      const image = findTag(ev, "image");
      return (
        <div className="long-form-note">
          <h3>{title}</h3>
          <div className="text">
            <p>{summary}</p>
            <Text
              id={ev.id}
              content={ev.content}
              highlighText={props.searchedValue}
              tags={ev.tags}
              creator={ev.pubkey}
              depth={props.depth}
              truncate={255}
              disableLinkPreview={true}
              disableMediaSpotlight={!(props.options?.showMediaSpotlight ?? true)}
            />
            {image && <ProxyImg src={image} />}
          </div>
        </div>
      );
    } else {
      const body = ev?.content ?? "";
      return (
        <Text
          id={ev.id}
          highlighText={props.searchedValue}
          content={body}
          tags={ev.tags}
          creator={ev.pubkey}
          depth={props.depth}
          disableMedia={!(options.showMedia ?? true)}
          disableMediaSpotlight={!(props.options?.showMediaSpotlight ?? true)}
        />
      );
    }
  };

  const transformBody = () => {
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
              <FormattedMessage
                defaultMessage="The author has marked this note as a <i>sensitive topic</i>"
                values={{
                  i: c => <i>{c}</i>,
                }}
              />
              {contentWarning[1] && (
                <>
                  &nbsp;
                  <FormattedMessage
                    defaultMessage="Reason: <i>{reason}</i>"
                    values={{
                      i: c => <i>{c}</i>,
                      reason: contentWarning[1],
                    }}
                  />
                </>
              )}
              &nbsp;
              <FormattedMessage defaultMessage="Click here to load anyway" />
            </>
          }>
          {innerContent()}
        </Reveal>
      );
    }
    return innerContent();
  };

  function goToEvent(
    e: React.MouseEvent,
    eTarget: TaggedNostrEvent,
    isTargetAllowed: boolean = e.target === e.currentTarget,
  ) {
    if (!isTargetAllowed || opt?.canClick === false) {
      return;
    }

    e.stopPropagation();
    if (props.onClick) {
      props.onClick(eTarget);
      return;
    }

    const link = NostrLink.fromEvent(eTarget);
    // detect cmd key and open in new tab
    if (e.metaKey) {
      window.open(`/e/${link.encode()}`, "_blank");
    } else {
      navigate(`/e/${link.encode()}`, {
        state: eTarget,
      });
    }
  }

  function replyTag() {
    const thread = EventExt.extractThread(ev);
    if (thread === undefined) {
      return undefined;
    }

    const maxMentions = 2;
    const replyTo = thread?.replyTo ?? thread?.root;
    const replyLink = replyTo
      ? NostrLink.fromTag(
          [replyTo.key, replyTo.value ?? "", replyTo.relay ?? "", replyTo.marker ?? ""].filter(a => a.length > 0),
        )
      : undefined;
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
          replyLink && <Link to={`/e/${replyLink.encode()}`}>{replyLink.encode().substring(0, 12)}</Link>
        )}
      </div>
    );
  }

  const canRenderAsTextNote = [EventKind.TextNote, EventKind.Polls, EventKind.LongFormTextNote];
  if (!canRenderAsTextNote.includes(ev.kind)) {
    const alt = findTag(ev, "alt");
    if (alt) {
      return (
        <div className="note-quote">
          <Text id={ev.id} content={alt} tags={[]} creator={ev.pubkey} />
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

  return !ignoreModeration && isEventMuted(ev) ? <HiddenNote>{note}</HiddenNote> : note;
}
