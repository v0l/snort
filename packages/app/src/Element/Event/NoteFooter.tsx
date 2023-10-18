import React, { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLongPress } from "use-long-press";
import { TaggedNostrEvent, ParsedZap, countLeadingZeros, NostrLink } from "@snort/system";
import { normalizeReaction } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import classNames from "classnames";

import { formatShort } from "Number";
import useEventPublisher from "Hooks/useEventPublisher";
import { delay, findTag } from "SnortUtils";
import { NoteCreator } from "Element/Event/NoteCreator";
import SendSats from "Element/SendSats";
import { ZapsSummary } from "Element/Event/Zap";
import { AsyncIcon, AsyncIconProps } from "Element/AsyncIcon";

import { useWallet } from "Wallet";
import useLogin from "Hooks/useLogin";
import { useInteractionCache } from "Hooks/useInteractionCache";
import { ZapPoolController } from "ZapPoolController";
import { Zapper, ZapTarget } from "Zapper";
import { getDisplayName } from "Element/User/DisplayName";
import { useNoteCreator } from "State/NoteCreator";
import Icon from "Icons/Icon";

import messages from "../messages";

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
  replies?: number;
  ev: TaggedNostrEvent;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev, positive, reposts, zaps } = props;
  const { formatMessage } = useIntl();
  const {
    publicKey,
    preferences: prefs,
    readonly,
  } = useLogin(s => ({ preferences: s.preferences, publicKey: s.publicKey, readonly: s.readonly }));
  const author = useUserProfile(ev.pubkey);
  const interactionCache = useInteractionCache(publicKey, ev.id);
  const { publisher, system } = useEventPublisher();
  const note = useNoteCreator(n => ({ show: n.show, replyTo: n.replyTo, update: n.update, quote: n.quote }));
  const willRenderNoteCreator = note.show && (note.replyTo?.id === ev.id || note.quote);
  const [tip, setTip] = useState(false);
  const [zapping, setZapping] = useState(false);
  const walletState = useWallet();
  const wallet = walletState.wallet;

  const canFastZap = wallet?.isReady() && !readonly;
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
      system.BroadcastEvent(evLike);
      await interactionCache.react();
    }
  }

  async function repost() {
    if (!hasReposted() && publisher) {
      if (!prefs.confirmReposts || window.confirm(formatMessage(messages.ConfirmRepost, { id: ev.id }))) {
        const evRepost = await publisher.repost(ev);
        system.BroadcastEvent(evRepost);
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
    if (canFastZap && lnurl) {
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
          if (CONFIG.features.zapPool) {
            ZapPoolController?.allocate(totalSent);
          }
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
          className={didZap ? "reacted text-nostr-orange" : "hover:text-nostr-orange"}
          {...longPress()}
          title={formatMessage({ defaultMessage: "Zap" })}
          iconName={canFastZap ? "zapFast" : "zap"}
          value={zapTotal}
          onClick={e => fastZap(e)}
        />
      );
    }
    return null;
  }

  function repostIcon() {
    if (readonly) return;
    return (
      <Menu
        menuButton={
          <AsyncFooterIcon
            className={hasReposted() ? "reacted text-nostr-blue" : "hover:text-nostr-blue"}
            iconName="repeat"
            title={formatMessage({ defaultMessage: "Repost" })}
            value={reposts.length}
          />
        }
        menuClassName="ctx-menu"
        align="start">
        <div className="close-menu-container">
          {/* This menu item serves as a "close menu" button;
          it allows the user to click anywhere nearby the menu to close it. */}
          <MenuItem>
            <div className="close-menu" />
          </MenuItem>
        </div>
        <MenuItem onClick={() => repost()} disabled={hasReposted()}>
          <Icon name="repeat" />
          <FormattedMessage defaultMessage="Repost" />
        </MenuItem>
        <MenuItem
          onClick={() =>
            note.update(n => {
              n.reset();
              n.quote = ev;
              n.show = true;
            })
          }>
          <Icon name="edit" />
          <FormattedMessage defaultMessage="Quote Repost" />
        </MenuItem>
      </Menu>
    );
  }

  function reactionIcon() {
    if (!prefs.enableReactions) {
      return null;
    }
    const reacted = hasReacted("+");
    return (
      <AsyncFooterIcon
        className={reacted ? "reacted text-nostr-red" : "hover:text-nostr-red"}
        iconName={reacted ? "heart-solid" : "heart"}
        title={formatMessage({ defaultMessage: "Like" })}
        value={positive.length}
        onClick={async () => {
          if (readonly) return;
          await react(prefs.reactionEmoji);
        }}
      />
    );
  }

  function replyIcon() {
    if (readonly) return;
    return (
      <AsyncFooterIcon
        className={note.show ? "reacted text-nostr-purple" : "hover:text-nostr-purple"}
        iconName="reply"
        title={formatMessage({ defaultMessage: "Reply" })}
        value={props.replies ?? 0}
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
        {willRenderNoteCreator && <NoteCreator key={`note-creator-${ev.id}`} />}
        <SendSats targets={getZapTarget()} onClose={() => setTip(false)} show={tip} note={ev.id} allocatePool={true} />
      </div>
      <ZapsSummary zaps={zaps} />
    </>
  );
}

function AsyncFooterIcon(props: AsyncIconProps & { value: number }) {
  const mergedProps = {
    ...props,
    iconSize: 18,
    className: classNames("transition duration-200 ease-in-out reaction-pill", props.className),
  };
  return (
    <AsyncIcon {...mergedProps}>
      {props.value > 0 && <div className="reaction-pill-number">{formatShort(props.value)}</div>}
    </AsyncIcon>
  );
}
