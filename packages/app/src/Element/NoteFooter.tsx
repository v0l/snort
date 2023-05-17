import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useIntl, FormattedMessage } from "react-intl";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { useLongPress } from "use-long-press";
import { TaggedRawEvent, HexKey, u256, encodeTLV, NostrPrefix, Lists } from "@snort/nostr";

import Icon from "Icons/Icon";
import Spinner from "Icons/Spinner";

import { formatShort } from "Number";
import useEventPublisher from "Feed/EventPublisher";
import { delay, normalizeReaction, unwrap } from "Util";
import { NoteCreator } from "Element/NoteCreator";
import { ReBroadcaster } from "Element/ReBroadcaster";
import Reactions from "Element/Reactions";
import SendSats from "Element/SendSats";
import { ParsedZap, ZapsSummary } from "Element/Zap";
import { useUserProfile } from "Hooks/useUserProfile";
import { RootState } from "State/Store";
import { setReplyTo, setShow, reset } from "State/NoteCreator";
import {
  setNote as setReBroadcastNote,
  setShow as setReBroadcastShow,
  reset as resetReBroadcast,
} from "State/ReBroadcast";
import useModeration from "Hooks/useModeration";
import { TranslateHost } from "Const";
import { LNURL } from "LNURL";
import { useWallet } from "Wallet";
import useLogin from "Hooks/useLogin";
import { setBookmarked, setPinned } from "Login";
import { useInteractionCache } from "Hooks/useInteractionCache";
import { ZapPoolController } from "ZapPoolController";

import messages from "./messages";

let isZapperBusy = false;
const barrierZapper = async <T,>(then: () => Promise<T>): Promise<T> => {
  while (isZapperBusy) {
    await delay(100);
  }
  isZapperBusy = true;
  try {
    return await then();
  } finally {
    isZapperBusy = false;
  }
};

export interface Translation {
  text: string;
  fromLanguage: string;
  confidence: number;
}

export interface NoteFooterProps {
  reposts: TaggedRawEvent[];
  zaps: ParsedZap[];
  positive: TaggedRawEvent[];
  negative: TaggedRawEvent[];
  showReactions: boolean;
  setShowReactions(b: boolean): void;
  ev: TaggedRawEvent;
  onTranslated?: (content: Translation) => void;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev, showReactions, setShowReactions, positive, negative, reposts, zaps } = props;
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const login = useLogin();
  const { pinned, bookmarked, publicKey, preferences: prefs, relays } = login;
  const { mute, block } = useModeration();
  const author = useUserProfile(ev.pubkey);
  const interactionCache = useInteractionCache(publicKey, ev.id);
  const publisher = useEventPublisher();
  const showNoteCreatorModal = useSelector((s: RootState) => s.noteCreator.show);
  const showReBroadcastModal = useSelector((s: RootState) => s.reBroadcast.show);
  const reBroadcastNote = useSelector((s: RootState) => s.reBroadcast.note);
  const replyTo = useSelector((s: RootState) => s.noteCreator.replyTo);
  const willRenderNoteCreator = showNoteCreatorModal && replyTo?.id === ev.id;
  const willRenderReBroadcast = showReBroadcastModal && reBroadcastNote && reBroadcastNote?.id === ev.id;
  const [tip, setTip] = useState(false);
  const [zapping, setZapping] = useState(false);
  const walletState = useWallet();
  const wallet = walletState.wallet;

  const isMine = ev.pubkey === publicKey;
  const lang = window.navigator.language;
  const langNames = new Intl.DisplayNames([...window.navigator.languages], {
    type: "language",
  });
  const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const didZap = interactionCache.data.zapped || zaps.some(a => a.sender === publicKey);
  const longPress = useLongPress(
    e => {
      e.stopPropagation();
      setTip(true);
    },
    {
      captureEvent: true,
    }
  );

  function hasReacted(emoji: string) {
    return (
      interactionCache.data.reacted ||
      positive?.some(({ pubkey, content }) => normalizeReaction(content) === emoji && pubkey === publicKey)
    );
  }

  function hasReposted() {
    return interactionCache.data.reposted || reposts.some(a => a.pubkey === publicKey);
  }

  async function react(content: string) {
    if (!hasReacted(content) && publisher) {
      const evLike = await publisher.react(ev, content);
      publisher.broadcast(evLike);
      await interactionCache.react();
    }
  }

  async function deleteEvent() {
    if (window.confirm(formatMessage(messages.ConfirmDeletion, { id: ev.id.substring(0, 8) })) && publisher) {
      const evDelete = await publisher.delete(ev.id);
      publisher.broadcast(evDelete);
    }
  }

  async function repost() {
    if (!hasReposted() && publisher) {
      if (!prefs.confirmReposts || window.confirm(formatMessage(messages.ConfirmRepost, { id: ev.id }))) {
        const evRepost = await publisher.repost(ev);
        publisher.broadcast(evRepost);
        await interactionCache.repost();
      }
    }
  }

  function getLNURL() {
    return ev.tags.find(a => a[0] === "zap")?.[1] || author?.lud16 || author?.lud06;
  }

  function getTargetName() {
    const zapTarget = ev.tags.find(a => a[0] === "zap")?.[1];
    if (zapTarget) {
      return new LNURL(zapTarget).name;
    } else {
      return author?.display_name || author?.name;
    }
  }

  async function fastZap(e?: React.MouseEvent) {
    if (zapping || e?.isPropagationStopped()) return;

    const lnurl = getLNURL();
    if (wallet?.isReady() && lnurl) {
      setZapping(true);
      try {
        await fastZapInner(lnurl, prefs.defaultZapAmount, ev.pubkey, ev.id);
      } catch (e) {
        console.warn("Fast zap failed", e);
        if (!(e instanceof Error) || e.message !== "User rejected") {
          setTip(true);
        }
      } finally {
        setZapping(false);
      }
    } else {
      setTip(true);
    }
  }

  async function fastZapInner(lnurl: string, amount: number, key: HexKey, id?: u256) {
    // only allow 1 invoice req/payment at a time to avoid hitting rate limits
    await barrierZapper(async () => {
      const handler = new LNURL(lnurl);
      await handler.load();

      const zr = Object.keys(relays.item);
      const zap = handler.canZap && publisher ? await publisher.zap(amount * 1000, key, zr, id) : undefined;
      const invoice = await handler.getInvoice(amount, undefined, zap);
      await wallet?.payInvoice(unwrap(invoice.pr));
      ZapPoolController.allocate(amount);

      await interactionCache.zap();
    });
  }

  useEffect(() => {
    if (prefs.autoZap && !didZap && !isMine && !zapping) {
      const lnurl = getLNURL();
      if (wallet?.isReady() && lnurl) {
        setZapping(true);
        queueMicrotask(async () => {
          try {
            await fastZapInner(lnurl, prefs.defaultZapAmount, ev.pubkey, ev.id);
          } catch {
            // ignored
          } finally {
            setZapping(false);
          }
        });
      }
    }
  }, [prefs.autoZap, author, zapping]);

  function tipButton() {
    const service = getLNURL();
    if (service) {
      return (
        <>
          <div className={`reaction-pill ${didZap ? "reacted" : ""}`} {...longPress()} onClick={e => fastZap(e)}>
            {zapping ? <Spinner /> : wallet?.isReady() ? <Icon name="zapFast" /> : <Icon name="zap" />}
            {zapTotal > 0 && <div className="reaction-pill-number">{formatShort(zapTotal)}</div>}
          </div>
        </>
      );
    }
    return null;
  }

  function repostIcon() {
    return (
      <div className={`reaction-pill ${hasReposted() ? "reacted" : ""}`} onClick={() => repost()}>
        <Icon name="repost" size={17} />
        {reposts.length > 0 && <div className="reaction-pill-number">{formatShort(reposts.length)}</div>}
      </div>
    );
  }

  function reactionIcons() {
    if (!prefs.enableReactions) {
      return null;
    }
    return (
      <>
        <div
          className={`reaction-pill ${hasReacted("+") ? "reacted" : ""} `}
          onClick={() => react(prefs.reactionEmoji)}>
          <Icon name="heart" />
          <div className="reaction-pill-number">{formatShort(positive.length)}</div>
        </div>
      </>
    );
  }

  async function share() {
    const link = encodeTLV(NostrPrefix.Event, ev.id, ev.relays);
    const url = `${window.location.protocol}//${window.location.host}/e/${link}`;
    if ("share" in window.navigator) {
      await window.navigator.share({
        title: "Snort",
        url: url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  async function translate() {
    const res = await fetch(`${TranslateHost}/translate`, {
      method: "POST",
      body: JSON.stringify({
        q: ev.content,
        source: "auto",
        target: lang.split("-")[0],
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const result = await res.json();
      if (typeof props.onTranslated === "function" && result) {
        props.onTranslated({
          text: result.translatedText,
          fromLanguage: langNames.of(result.detectedLanguage.language),
          confidence: result.detectedLanguage.confidence,
        } as Translation);
      }
    }
  }

  async function copyId() {
    const link = encodeTLV(NostrPrefix.Event, ev.id, ev.relays);
    await navigator.clipboard.writeText(link);
  }

  async function pin(id: HexKey) {
    if (publisher) {
      const es = [...pinned.item, id];
      const ev = await publisher.noteList(es, Lists.Pinned);
      publisher.broadcast(ev);
      setPinned(login, es, ev.created_at * 1000);
    }
  }

  async function bookmark(id: HexKey) {
    if (publisher) {
      const es = [...bookmarked.item, id];
      const ev = await publisher.noteList(es, Lists.Bookmarked);
      publisher.broadcast(ev);
      setBookmarked(login, es, ev.created_at * 1000);
    }
  }

  async function copyEvent() {
    await navigator.clipboard.writeText(JSON.stringify(ev, undefined, "  "));
  }

  function menuItems() {
    return (
      <>
        <div className="close-menu-container">
          {/* This menu item serves as a "close menu" button;
          it allows the user to click anywhere nearby the menu to close it. */}
          <MenuItem>
            <div className="close-menu" />
          </MenuItem>
        </div>
        <MenuItem onClick={() => setShowReactions(true)}>
          <Icon name="heart" />
          <FormattedMessage {...messages.Reactions} />
        </MenuItem>
        <MenuItem onClick={() => share()}>
          <Icon name="share" />
          <FormattedMessage {...messages.Share} />
        </MenuItem>
        {!pinned.item.includes(ev.id) && (
          <MenuItem onClick={() => pin(ev.id)}>
            <Icon name="pin" />
            <FormattedMessage {...messages.Pin} />
          </MenuItem>
        )}
        {!bookmarked.item.includes(ev.id) && (
          <MenuItem onClick={() => bookmark(ev.id)}>
            <Icon name="bookmark" />
            <FormattedMessage {...messages.Bookmark} />
          </MenuItem>
        )}
        <MenuItem onClick={() => copyId()}>
          <Icon name="copy" />
          <FormattedMessage {...messages.CopyID} />
        </MenuItem>
        <MenuItem onClick={() => mute(ev.pubkey)}>
          <Icon name="mute" />
          <FormattedMessage {...messages.Mute} />
        </MenuItem>
        {prefs.enableReactions && (
          <MenuItem onClick={() => react("-")}>
            <Icon name="dislike" />
            <FormattedMessage {...messages.DislikeAction} />
          </MenuItem>
        )}
        {ev.pubkey === publicKey && (
          <MenuItem onClick={handleReBroadcastButtonClick}>
            <Icon name="relay" />
            <FormattedMessage {...messages.ReBroadcast} />
          </MenuItem>
        )}
        {ev.pubkey !== publicKey && (
          <MenuItem onClick={() => block(ev.pubkey)}>
            <Icon name="block" />
            <FormattedMessage {...messages.Block} />
          </MenuItem>
        )}
        <MenuItem onClick={() => translate()}>
          <Icon name="translate" />
          <FormattedMessage {...messages.TranslateTo} values={{ lang: langNames.of(lang.split("-")[0]) }} />
        </MenuItem>
        {prefs.showDebugMenus && (
          <MenuItem onClick={() => copyEvent()}>
            <Icon name="json" />
            <FormattedMessage {...messages.CopyJSON} />
          </MenuItem>
        )}
        {isMine && (
          <MenuItem onClick={() => deleteEvent()}>
            <Icon name="trash" className="red" />
            <FormattedMessage {...messages.Delete} />
          </MenuItem>
        )}
      </>
    );
  }

  const handleReplyButtonClick = () => {
    if (replyTo?.id !== ev.id) {
      dispatch(reset());
    }

    dispatch(setReplyTo(ev));
    dispatch(setShow(!showNoteCreatorModal));
  };

  const handleReBroadcastButtonClick = () => {
    if (reBroadcastNote?.id !== ev.id) {
      dispatch(resetReBroadcast());
    }

    dispatch(setReBroadcastNote(ev));
    dispatch(setReBroadcastShow(!showReBroadcastModal));
  };

  return (
    <>
      <div className="footer">
        <div className="footer-reactions">
          {tipButton()}
          {reactionIcons()}
          {repostIcon()}
          <div className={`reaction-pill ${showNoteCreatorModal ? "reacted" : ""}`} onClick={handleReplyButtonClick}>
            <Icon name="reply" size={17} />
          </div>
          <Menu
            menuButton={
              <div className="reaction-pill">
                <Icon name="dots" size={15} />
              </div>
            }
            menuClassName="ctx-menu">
            {menuItems()}
          </Menu>
        </div>
        {willRenderNoteCreator && <NoteCreator />}
        {willRenderReBroadcast && <ReBroadcaster />}
        <Reactions
          show={showReactions}
          setShow={setShowReactions}
          positive={positive}
          negative={negative}
          reposts={reposts}
          zaps={zaps}
        />
        <SendSats
          lnurl={getLNURL()}
          onClose={() => setTip(false)}
          show={tip}
          author={author?.pubkey}
          target={getTargetName()}
          note={ev.id}
          allocatePool={true}
        />
      </div>
      <div className="zaps-container">
        <ZapsSummary zaps={zaps} />
      </div>
    </>
  );
}
