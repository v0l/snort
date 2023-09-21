import React, { HTMLProps, useContext, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useLongPress } from "use-long-press";
import { TaggedNostrEvent, ParsedZap, countLeadingZeros, NostrLink } from "@snort/system";
import { SnortContext, useUserProfile } from "@snort/system-react";

import { formatShort } from "Number";
import useEventPublisher from "Hooks/useEventPublisher";
import { delay, findTag, normalizeReaction } from "SnortUtils";
import { NoteCreator } from "Element/NoteCreator";
import SendSats from "Element/SendSats";
import { ZapsSummary } from "Element/Zap";
import { AsyncIcon } from "Element/AsyncIcon";

import { useWallet } from "Wallet";
import useLogin from "Hooks/useLogin";
import { useInteractionCache } from "Hooks/useInteractionCache";
import { ZapPoolController } from "ZapPoolController";
import { System } from "index";
import { Zapper, ZapTarget } from "Zapper";
import { getDisplayName } from "./ProfileImage";
import { useNoteCreator } from "State/NoteCreator";

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
  const system = useContext(SnortContext);
  const { formatMessage } = useIntl();
  const login = useLogin();
  const { publicKey, preferences: prefs } = login;
  const author = useUserProfile(ev.pubkey);
  const interactionCache = useInteractionCache(publicKey, ev.id);
  const publisher = useEventPublisher();
  const note = useNoteCreator();
  const willRenderNoteCreator = note.show && note.replyTo?.id === ev.id;
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
    },
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

  function getZapTarget(): Array<ZapTarget> | undefined {
    if (ev.tags.some(v => v[0] === "zap")) {
      return Zapper.fromEvent(ev);
    }

    const authorTarget = author?.lud16 || author?.lud06;
    if (authorTarget) {
      return [
        {
          type: "lnurl",
          value: authorTarget,
          weight: 1,
          name: getDisplayName(author, ev.pubkey),
          zap: {
            pubkey: ev.pubkey,
            event: NostrLink.fromEvent(ev),
          },
        } as ZapTarget,
      ];
    }
  }

  async function fastZap(e?: React.MouseEvent) {
    if (zapping || e?.isPropagationStopped()) return;

    const lnurl = getZapTarget();
    if (wallet?.isReady() && lnurl) {
      setZapping(true);
      try {
        await fastZapInner(lnurl, prefs.defaultZapAmount);
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

  async function fastZapInner(targets: Array<ZapTarget>, amount: number) {
    if (wallet) {
      // only allow 1 invoice req/payment at a time to avoid hitting rate limits
      await barrierZapper(async () => {
        const zapper = new Zapper(system, publisher);
        const result = await zapper.send(wallet, targets, amount);
        const totalSent = result.reduce((acc, v) => (acc += v.sent), 0);
        if (totalSent > 0) {
          ZapPoolController.allocate(totalSent);
          await interactionCache.zap();
        }
      });
    }
  }

  useEffect(() => {
    if (prefs.autoZap && !didZap && !isMine && !zapping) {
      const lnurl = getZapTarget();
      if (wallet?.isReady() && lnurl) {
        setZapping(true);
        queueMicrotask(async () => {
          try {
            await fastZapInner(lnurl, prefs.defaultZapAmount);
          } catch {
            // ignored
          } finally {
            setZapping(false);
          }
        });
      }
    }
  }, [prefs.autoZap, author, zapping]);

  function powIcon() {
    const pow = findTag(ev, "nonce") ? countLeadingZeros(ev.id) : undefined;
    if (pow) {
      return (
        <AsyncFooterIcon title={formatMessage({ defaultMessage: "Proof of Work" })} iconName="diamond" value={pow} />
      );
    }
  }

  function tipButton() {
    const targets = getZapTarget();
    if (targets) {
      return (
        <AsyncFooterIcon
          className={didZap ? "reacted" : ""}
          {...longPress()}
          title={formatMessage({ defaultMessage: "Zap" })}
          iconName={wallet?.isReady() ? "zapFast" : "zap"}
          value={zapTotal}
          onClick={e => fastZap(e)}
        />
      );
    }
    return null;
  }

  function repostIcon() {
    return (
      <AsyncFooterIcon
        className={hasReposted() ? "reacted" : ""}
        iconName="repeat"
        title={formatMessage({ defaultMessage: "Repost" })}
        value={reposts.length}
        onClick={() => repost()}
      />
    );
  }

  function reactionIcon() {
    if (!prefs.enableReactions) {
      return null;
    }
    const reacted = hasReacted("+");
    return (
      <AsyncFooterIcon
        className={reacted ? "reacted" : ""}
        iconName={reacted ? "heart-solid" : "heart"}
        title={formatMessage({ defaultMessage: "Like" })}
        value={positive.length}
        onClick={() => react(prefs.reactionEmoji)}
      />
    );
  }

  function replyIcon() {
    return (
      <AsyncFooterIcon
        className={note.show ? "reacted" : ""}
        iconName="reply"
        title={formatMessage({ defaultMessage: "Reply" })}
        value={0}
        onClick={async () => handleReplyButtonClick()}
      />
    );
  }

  const handleReplyButtonClick = () => {
    note.update(v => {
      if (v.replyTo?.id !== ev.id) {
        v.reset();
      }
      v.show = true;
      v.replyTo = ev;
    });
  };

  return (
    <>
      <div className="footer">
        <div className="footer-reactions">
          {replyIcon()}
          {repostIcon()}
          {reactionIcon()}
          {tipButton()}
          {powIcon()}
        </div>
        {willRenderNoteCreator && <NoteCreator />}
        <SendSats targets={getZapTarget()} onClose={() => setTip(false)} show={tip} note={ev.id} allocatePool={true} />
      </div>
      <ZapsSummary zaps={zaps} />
    </>
  );
}

interface AsyncFooterIconProps extends HTMLProps<HTMLDivElement> {
  iconName: string;
  value: number;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => Promise<void>;
}

function AsyncFooterIcon(props: AsyncFooterIconProps) {
  const mergedProps = {
    ...props,
    iconSize: 18,
    className: `reaction-pill${props.className ? ` ${props.className}` : ""}`,
  };
  return (
    <AsyncIcon {...mergedProps}>
      {props.value > 0 && <div className="reaction-pill-number">{formatShort(props.value)}</div>}
    </AsyncIcon>
  );
}
