import { barrierQueue, normalizeReaction, processWorkQueue, WorkQueueItem } from "@snort/shared";
import { countLeadingZeros, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useEventReactions, useReactions, useUserProfile } from "@snort/system-react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import classNames from "classnames";
import React, { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLongPress } from "use-long-press";

import { AsyncFooterIcon } from "@/Components/Event/Note/AsyncFooterIcon";
import { ZapsSummary } from "@/Components/Event/ZapsSummary";
import Icon from "@/Components/Icons/Icon";
import SendSats from "@/Components/SendSats/SendSats";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { useInteractionCache } from "@/Hooks/useInteractionCache";
import useLogin from "@/Hooks/useLogin";
import { useNoteCreator } from "@/State/NoteCreator";
import { findTag, getDisplayName } from "@/Utils";
import { Zapper, ZapTarget } from "@/Utils/Zapper";
import { ZapPoolController } from "@/Utils/ZapPoolController";
import { useWallet } from "@/Wallet";

import messages from "../../messages";

const ZapperQueue: Array<WorkQueueItem> = [];
processWorkQueue(ZapperQueue);

export interface NoteFooterProps {
  replies?: number;
  ev: TaggedNostrEvent;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev } = props;
  const link = useMemo(() => NostrLink.fromEvent(ev), [ev.id]);
  const ids = useMemo(() => [link], [link]);

  const related = useReactions("note:reactions", ids, undefined, false);
  const { reactions, zaps, reposts } = useEventReactions(link, related);
  const { positive } = reactions;

  const { formatMessage } = useIntl();
  const {
    publicKey,
    preferences: prefs,
    readonly,
  } = useLogin(s => ({ preferences: s.appData.item.preferences, publicKey: s.publicKey, readonly: s.readonly }));
  const author = useUserProfile(ev.pubkey);
  const interactionCache = useInteractionCache(publicKey, ev.id);
  const { publisher, system } = useEventPublisher();
  const note = useNoteCreator(n => ({ show: n.show, replyTo: n.replyTo, update: n.update, quote: n.quote }));
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
      interactionCache.react();
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
            event: link,
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
      await barrierQueue(ZapperQueue, async () => {
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
        <AsyncFooterIcon
          className={"hidden md:flex flex-none min-w-[50px] md:min-w-[80px]"}
          title={formatMessage({ defaultMessage: "Proof of Work", id: "grQ+mI" })}
          iconName="diamond"
          value={pow}
        />
      );
    }
  }

  function tipButton() {
    const targets = getZapTarget();
    if (targets) {
      return (
        <div className="flex flex-row flex-none min-w-[50px] md:min-w-[80px] gap-4 items-center">
          <AsyncFooterIcon
            className={didZap ? "reacted text-nostr-orange" : "hover:text-nostr-orange"}
            {...longPress()}
            title={formatMessage({ defaultMessage: "Zap", id: "fBI91o" })}
            iconName={canFastZap ? "zapFast" : "zap"}
            value={zapTotal}
            onClick={e => fastZap(e)}
          />
          <ZapsSummary zaps={zaps} />
        </div>
      );
    }
    return <div className="w-[18px]"></div>;
  }

  function repostIcon() {
    if (readonly) return;
    return (
      <Menu
        menuButton={
          <AsyncFooterIcon
            className={classNames(
              "flex-none min-w-[50px] md:min-w-[80px]",
              hasReposted() ? "reacted text-nostr-blue" : "hover:text-nostr-blue",
            )}
            iconName="repeat"
            title={formatMessage({ defaultMessage: "Repost", id: "JeoS4y" })}
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
          <FormattedMessage defaultMessage="Repost" id="JeoS4y" />
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
          <FormattedMessage defaultMessage="Quote Repost" id="C7642/" />
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
        className={classNames(
          "flex-none min-w-[50px] md:min-w-[80px]",
          reacted ? "reacted text-nostr-red" : "hover:text-nostr-red",
        )}
        iconName={reacted ? "heart-solid" : "heart"}
        title={formatMessage({ defaultMessage: "Like", id: "qtWLmt" })}
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
        className={classNames(
          "flex-none min-w-[50px] md:min-w-[80px]",
          note.show ? "reacted text-nostr-purple" : "hover:text-nostr-purple",
        )}
        iconName="reply"
        title={formatMessage({ defaultMessage: "Reply", id: "9HU8vw" })}
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
    <div className="flex flex-row gap-4 overflow-hidden max-w-full h-6 items-center">
      {replyIcon()}
      {repostIcon()}
      {reactionIcon()}
      {powIcon()}
      {tipButton()}
      <SendSats targets={getZapTarget()} onClose={() => setTip(false)} show={tip} note={ev.id} allocatePool={true} />
    </div>
  );
}
