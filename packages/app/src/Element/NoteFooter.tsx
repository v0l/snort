import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useIntl, FormattedMessage } from "react-intl";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { useLongPress } from "use-long-press";
import { Event as NEvent, TaggedRawEvent, HexKey, u256 } from "@snort/nostr";

import Icon from "Icons/Icon";
import Spinner from "Icons/Spinner";

import { formatShort } from "Number";
import useEventPublisher from "Feed/EventPublisher";
import { bech32ToHex, hexToBech32, normalizeReaction, unwrap } from "Util";
import { NoteCreator } from "Element/NoteCreator";
import Reactions from "Element/Reactions";
import SendSats from "Element/SendSats";
import { ParsedZap, ZapsSummary } from "Element/Zap";
import { useUserProfile } from "Hooks/useUserProfile";
import { RootState } from "State/Store";
import { UserPreferences, setPinned, setBookmarked } from "State/Login";
import useModeration from "Hooks/useModeration";
import { SnortPubKey, TranslateHost } from "Const";
import { LNURL } from "LNURL";
import { DonateLNURL } from "Pages/DonatePage";
import { useWallet } from "Wallet";

import messages from "./messages";

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
  ev: NEvent;
  onTranslated?: (content: Translation) => void;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev, showReactions, setShowReactions, positive, negative, reposts, zaps } = props;
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const { pinned, bookmarked } = useSelector((s: RootState) => s.login);
  const login = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const { mute, block } = useModeration();
  const prefs = useSelector<RootState, UserPreferences>(s => s.login.preferences);
  const author = useUserProfile(ev.RootPubKey);
  const publisher = useEventPublisher();
  const [reply, setReply] = useState(false);
  const [tip, setTip] = useState(false);
  const [zapping, setZapping] = useState(false);
  const walletState = useWallet();
  const wallet = walletState.wallet;

  const isMine = ev.RootPubKey === login;
  const lang = window.navigator.language;
  const langNames = new Intl.DisplayNames([...window.navigator.languages], {
    type: "language",
  });
  const zapTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const didZap = zaps.some(a => a.zapper === login);
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
    return positive?.some(({ pubkey, content }) => normalizeReaction(content) === emoji && pubkey === login);
  }

  function hasReposted() {
    return reposts.some(a => a.pubkey === login);
  }

  async function react(content: string) {
    if (!hasReacted(content)) {
      const evLike = await publisher.react(ev, content);
      publisher.broadcast(evLike);
    }
  }

  async function deleteEvent() {
    if (window.confirm(formatMessage(messages.ConfirmDeletion, { id: ev.Id.substring(0, 8) }))) {
      const evDelete = await publisher.delete(ev.Id);
      publisher.broadcast(evDelete);
    }
  }

  async function repost() {
    if (!hasReposted()) {
      if (!prefs.confirmReposts || window.confirm(formatMessage(messages.ConfirmRepost, { id: ev.Id }))) {
        const evRepost = await publisher.repost(ev);
        publisher.broadcast(evRepost);
      }
    }
  }

  async function fastZap(e: React.MouseEvent) {
    if (zapping || e.isPropagationStopped()) return;

    const lnurl = author?.lud16 || author?.lud06;
    if (wallet?.isReady() && lnurl) {
      setZapping(true);
      try {
        if (prefs.fastZapDonate > 0) {
          // spin off donate
          const donateAmount = Math.floor(prefs.defaultZapAmount * prefs.fastZapDonate);
          if (donateAmount > 0) {
            console.debug(`Donating ${donateAmount} sats to ${DonateLNURL}`);
            fastZapInner(DonateLNURL, donateAmount, bech32ToHex(SnortPubKey))
              .then(() => console.debug("Donation sent! Thank You!"))
              .catch(() => console.debug("Failed to donate"));
          }
        }
        await fastZapInner(lnurl, prefs.defaultZapAmount, ev.PubKey, ev.Id);
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
    if (wallet?.isReady() && lnurl) {
      const handler = new LNURL(lnurl);
      await handler.load();
      const zap = handler.canZap ? await publisher.zap(amount * 1000, key, id) : undefined;
      const invoice = await handler.getInvoice(amount, undefined, zap);
      await wallet.payInvoice(unwrap(invoice.pr));
    }
  }

  function tipButton() {
    const service = author?.lud16 || author?.lud06;
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
        {repostIcon()}
      </>
    );
  }

  async function share() {
    const url = `${window.location.protocol}//${window.location.host}/e/${hexToBech32("note", ev.Id)}`;
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
        q: ev.Content,
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
    await navigator.clipboard.writeText(hexToBech32("note", ev.Id));
  }

  async function pin(id: HexKey) {
    const es = [...pinned, id];
    const ev = await publisher.pinned(es);
    publisher.broadcast(ev);
    dispatch(setPinned({ keys: es, createdAt: new Date().getTime() }));
  }

  async function bookmark(id: HexKey) {
    const es = [...bookmarked, id];
    const ev = await publisher.bookmarked(es);
    publisher.broadcast(ev);
    dispatch(setBookmarked({ keys: es, createdAt: new Date().getTime() }));
  }

  async function copyEvent() {
    await navigator.clipboard.writeText(JSON.stringify(ev.Original, undefined, "  "));
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
        {!pinned.includes(ev.Id) && (
          <MenuItem onClick={() => pin(ev.Id)}>
            <Icon name="pin" />
            <FormattedMessage {...messages.Pin} />
          </MenuItem>
        )}
        {!bookmarked.includes(ev.Id) && (
          <MenuItem onClick={() => bookmark(ev.Id)}>
            <Icon name="bookmark" />
            <FormattedMessage {...messages.Bookmark} />
          </MenuItem>
        )}
        <MenuItem onClick={() => copyId()}>
          <Icon name="dislike" />
          <FormattedMessage {...messages.CopyID} />
        </MenuItem>
        <MenuItem onClick={() => mute(ev.PubKey)}>
          <Icon name="mute" />
          <FormattedMessage {...messages.Mute} />
        </MenuItem>
        {prefs.enableReactions && (
          <MenuItem onClick={() => react("-")}>
            <Icon name="copy" />
            <FormattedMessage {...messages.DislikeAction} />
          </MenuItem>
        )}
        <MenuItem onClick={() => block(ev.PubKey)}>
          <Icon name="block" />
          <FormattedMessage {...messages.Block} />
        </MenuItem>
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

  return (
    <>
      <div className="footer">
        <div className="footer-reactions">
          {tipButton()}
          {reactionIcons()}
          <div className={`reaction-pill ${reply ? "reacted" : ""}`} onClick={() => setReply(s => !s)}>
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
        <NoteCreator autoFocus={true} replyTo={ev} onSend={() => setReply(false)} show={reply} setShow={setReply} />
        <Reactions
          show={showReactions}
          setShow={setShowReactions}
          positive={positive}
          negative={negative}
          reposts={reposts}
          zaps={zaps}
        />
        <SendSats
          lnurl={author?.lud16 || author?.lud06}
          onClose={() => setTip(false)}
          show={tip}
          author={author?.pubkey}
          target={author?.display_name || author?.name}
          note={ev.Id}
        />
      </div>
      <div className="zaps-container">
        <ZapsSummary zaps={zaps} />
      </div>
    </>
  );
}
