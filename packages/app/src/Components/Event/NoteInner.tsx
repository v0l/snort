import { EventExt, EventKind, HexKey, NostrLink, NostrPrefix, TaggedNostrEvent } from "@snort/system";
import { useEventReactions } from "@snort/system-react";
import classNames from "classnames";
import React, { ReactNode, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useNavigate } from "react-router-dom";

import { UserCache } from "@/Cache";
import Icon from "@/Components/Icons/Icon";
import DisplayName from "@/Components/User/DisplayName";
import { ProfileLink } from "@/Components/User/ProfileLink";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import { chainKey } from "@/Hooks/useThreadContext";
import { findTag, hexToBech32 } from "@/Utils";
import { setBookmarked, setPinned } from "@/Utils/Login";

import messages from "../messages";
import Text from "../Text/Text";
import ProfileImage from "../User/ProfileImage";
import HiddenNote from "./HiddenNote";
import { NoteProps } from "./Note";
import { NoteContextMenu, NoteTranslation } from "./NoteContextMenu";
import NoteFooter from "./NoteFooter";
import NoteTime from "./NoteTime";
import Poll from "./Poll";
import Reactions from "./Reactions";
import Reveal from "./Reveal";

const TEXT_TRUNCATE_LENGTH = 400;

export function NoteInner(props: NoteProps) {
  const { data: ev, related, highlight, options: opt, ignoreModeration = false, className, waitUntilInView } = props;

  const baseClassName = classNames("note min-h-[110px] flex flex-col gap-4 card", className);
  const navigate = useNavigate();
  const [showReactions, setShowReactions] = useState(false);

  const { isEventMuted } = useModeration();
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "2000px" });
  const { reactions, reposts, deletions, zaps } = useEventReactions(NostrLink.fromEvent(ev), related);
  const login = useLogin();
  const { pinned, bookmarked } = useLogin();
  const { publisher, system } = useEventPublisher();
  const [translated, setTranslated] = useState<NoteTranslation>();
  const [showTranslation, setShowTranslation] = useState(true);
  const { formatMessage } = useIntl();
  const [showMore, setShowMore] = useState(false);

  const totalReactions = reactions.positive.length + reactions.negative.length + reposts.length + zaps.length;

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
        const ev = await publisher.pinned(es.map(a => new NostrLink(NostrPrefix.Note, a)));
        system.BroadcastEvent(ev);
        setPinned(login, es, ev.created_at * 1000);
      }
    }
  }

  async function unbookmark(id: HexKey) {
    if (options.canUnbookmark && publisher) {
      if (window.confirm(formatMessage(messages.ConfirmUnbookmark))) {
        const es = bookmarked.item.filter(e => e !== id);
        const ev = await publisher.pinned(es.map(a => new NostrLink(NostrPrefix.Note, a)));
        system.BroadcastEvent(ev);
        setBookmarked(login, es, ev.created_at * 1000);
      }
    }
  }

  const ToggleShowMore = () => (
    <a
      className="highlight"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        setShowMore(!showMore);
      }}>
      {showMore ? (
        <FormattedMessage defaultMessage="Show less" id="qyJtWy" />
      ) : (
        <FormattedMessage defaultMessage="Show more" id="aWpBzj" />
      )}
    </a>
  );

  const innerContent = useMemo(() => {
    const body = translated && showTranslation ? translated.text : ev?.content ?? "";
    const id = translated && showTranslation ? `${ev.id}-translated` : ev.id;
    const shouldTruncate = opt?.truncate && body.length > TEXT_TRUNCATE_LENGTH;

    return (
      <>
        {shouldTruncate && showMore && <ToggleShowMore />}
        <Text
          id={id}
          highlighText={props.searchedValue}
          content={body}
          tags={ev.tags}
          creator={ev.pubkey}
          depth={props.depth}
          disableMedia={!(options.showMedia ?? true)}
          disableMediaSpotlight={!(props.options?.showMediaSpotlight ?? true)}
          truncate={shouldTruncate && !showMore ? TEXT_TRUNCATE_LENGTH : undefined}
        />
        {shouldTruncate && !showMore && <ToggleShowMore />}
      </>
    );
  }, [
    showMore,
    ev,
    translated,
    showTranslation,
    props.searchedValue,
    props.depth,
    options.showMedia,
    props.options?.showMediaSpotlight,
    opt?.truncate,
    TEXT_TRUNCATE_LENGTH,
  ]);

  const transformBody = () => {
    if (deletions?.length > 0) {
      return (
        <b className="error">
          <FormattedMessage {...messages.Deleted} />
        </b>
      );
    }
    if (!login.appData.item.showContentWarningPosts) {
      const contentWarning = ev.tags.find(a => a[0] === "content-warning");
      if (contentWarning) {
        return (
          <Reveal
            message={
              <>
                <FormattedMessage
                  defaultMessage="The author has marked this note as a <i>sensitive topic</i>"
                  id="StKzTE"
                  values={{
                    i: c => <i>{c}</i>,
                  }}
                />
                {contentWarning[1] && (
                  <>
                    &nbsp;
                    <FormattedMessage
                      defaultMessage="Reason: <i>{reason}</i>"
                      id="6OSOXl"
                      values={{
                        i: c => <i>{c}</i>,
                        reason: contentWarning[1],
                      }}
                    />
                  </>
                )}
                . <FormattedMessage defaultMessage="Click here to load anyway" id="IoQq+a" />.{" "}
                <Link to="/settings/moderation">
                  <i>
                    <FormattedMessage defaultMessage="Settings" id="D3idYv" />
                  </i>
                </Link>
              </>
            }>
            {innerContent}
          </Reveal>
        );
      }
    }
    return innerContent;
  };

  function goToEvent(e: React.MouseEvent, eTarget: TaggedNostrEvent) {
    if (opt?.canClick === false) {
      return;
    }

    let target = e.target as HTMLElement | null;
    while (target) {
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.classList.contains("reaction-pill") ||
        target.classList.contains("szh-menu-container")
      ) {
        return; // is there a better way to do this?
      }
      target = target.parentElement;
    }

    e.stopPropagation();
    if (props.onClick) {
      props.onClick(eTarget);
      return;
    }

    const link = NostrLink.fromEvent(eTarget);
    // detect cmd key and open in new tab
    if (e.metaKey) {
      window.open(`/${link.encode(CONFIG.eventLinkPrefix)}`, "_blank");
    } else {
      navigate(`/${link.encode(CONFIG.eventLinkPrefix)}`, {
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
        link: (
          <ProfileLink pubkey={pk} user={u}>
            <DisplayName pubkey={pk} user={u} />{" "}
          </ProfileLink>
        ),
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
    const link = replyLink?.encode(CONFIG.eventLinkPrefix);
    return (
      <div className="reply">
        re:&nbsp;
        {(mentions?.length ?? 0) > 0 ? (
          <>
            {pubMentions} {others}
          </>
        ) : (
          replyLink && <Link to={`/${link}`}>{link?.substring(0, 12)}</Link>
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
          <span
            className="text-xs font-semibold text-gray-light select-none"
            onClick={e => {
              e.stopPropagation();
              setShowTranslation(s => !s);
            }}>
            <FormattedMessage {...messages.TranslatedFrom} values={{ lang: translated.fromLanguage }} />
          </span>
        </>
      );
    } else if (translated) {
      return (
        <p className="text-xs font-semibold text-gray-light">
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
    if (waitUntilInView && !inView) return undefined;
    return (
      <>
        {options.showHeader && (
          <div className="header flex">
            <ProfileImage
              pubkey={ev.pubkey}
              subHeader={replyTag() ?? undefined}
              link={opt?.canClick === undefined ? undefined : ""}
              showProfileCard={options.showProfileCard ?? true}
              showBadges={true}
            />
            <div className="info">
              {props.context}
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
            <span className="reactions-link cursor-pointer" onClick={() => setShowReactions(true)}>
              <FormattedMessage {...messages.ReactionsLink} values={{ n: totalReactions }} />
            </span>
          )}
        </div>
        {options.showFooter && (
          <NoteFooter
            ev={ev}
            positive={reactions.positive}
            reposts={reposts}
            zaps={zaps}
            replies={props.threadChains?.get(chainKey(ev))?.length}
          />
        )}
        <Reactions
          show={showReactions}
          setShow={setShowReactions}
          positive={reactions.positive}
          negative={reactions.negative}
          reposts={reposts}
          zaps={zaps}
        />
      </>
    );
  }

  const note = (
    <div
      className={classNames(baseClassName, {
        active: highlight,
        "hover:bg-nearly-bg-color cursor-pointer": !opt?.isRoot,
      })}
      onClick={e => goToEvent(e, ev)}
      ref={ref}>
      {content()}
    </div>
  );

  return !ignoreModeration && isEventMuted(ev) ? <HiddenNote>{note}</HiddenNote> : note;
}
