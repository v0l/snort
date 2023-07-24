import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useIntl } from "react-intl";
import { useLongPress } from "use-long-press";
import { TaggedNostrEvent, HexKey, u256, ParsedZap } from "@snort/system";
import { LNURL } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";

import Icon from "Icons/Icon";
import Spinner from "Icons/Spinner";

import { formatShort } from "Number";
import useEventPublisher from "Feed/EventPublisher";
import { delay, normalizeReaction, unwrap } from "SnortUtils";
import { NoteCreator } from "Element/NoteCreator";
import SendSats from "Element/SendSats";
import { ZapsSummary } from "Element/Zap";
import { RootState } from "State/Store";
import { setReplyTo, setShow, reset } from "State/NoteCreator";

import { useWallet } from "Wallet";
import useLogin from "Hooks/useLogin";
import { useInteractionCache } from "Hooks/useInteractionCache";
import { ZapPoolController } from "ZapPoolController";
import { System } from "index";

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

export interface NoteFooterProps {
  reposts: TaggedNostrEvent[];
  zaps: ParsedZap[];
  positive: TaggedNostrEvent[];
  ev: TaggedNostrEvent;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev, positive, reposts, zaps } = props;
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const login = useLogin();
  const { publicKey, preferences: prefs, relays } = login;
  const author = useUserProfile(System, ev.pubkey);
  const interactionCache = useInteractionCache(publicKey, ev.id);
  const publisher = useEventPublisher();
  const showNoteCreatorModal = useSelector((s: RootState) => s.noteCreator.show);
  const replyTo = useSelector((s: RootState) => s.noteCreator.replyTo);
  const willRenderNoteCreator = showNoteCreatorModal && replyTo?.id === ev.id;
  const [tip, setTip] = useState(false);
  const [zapping, setZapping] = useState(false);
  const walletState = useWallet();
  const wallet = walletState.wallet;

  const isMine = ev.pubkey === publicKey;
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
      System.BroadcastEvent(evLike);
      await interactionCache.react();
    }
  }

  async function repost() {
    if (!hasReposted() && publisher) {
      if (!prefs.confirmReposts || window.confirm(formatMessage(messages.ConfirmRepost, { id: ev.id }))) {
        const evRepost = await publisher.repost(ev);
        System.BroadcastEvent(evRepost);
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
        <Icon name="repeat" size={18} />
        {reposts.length > 0 && <div className="reaction-pill-number">{formatShort(reposts.length)}</div>}
      </div>
    );
  }

  function reactionIcons() {
    if (!prefs.enableReactions) {
      return null;
    }
    const reacted = hasReacted("+");
    return (
      <>
        <div className={`reaction-pill ${reacted ? "reacted" : ""} `} onClick={() => react(prefs.reactionEmoji)}>
          <Icon name={reacted ? "heart-solid" : "heart"} size={18} />
          <div className="reaction-pill-number">{formatShort(positive.length)}</div>
        </div>
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
        </div>
        {willRenderNoteCreator && <NoteCreator />}
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
      <ZapsSummary zaps={zaps} />
    </>
  );
}
