import { normalizeReaction } from "@snort/shared";
import { countLeadingZeros, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useEventReactions, useReactions } from "@snort/system-react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import classNames from "classnames";
import React, { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { AsyncFooterIcon } from "@/Components/Event/Note/NoteFooter/AsyncFooterIcon";
import { FooterZapButton } from "@/Components/Event/Note/NoteFooter/FooterZapButton";
import Icon from "@/Components/Icons/Icon";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { useInteractionCache } from "@/Hooks/useInteractionCache";
import useLogin from "@/Hooks/useLogin";
import { useNoteCreator } from "@/State/NoteCreator";
import { findTag } from "@/Utils";

import messages from "../../../messages";

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
  const interactionCache = useInteractionCache(publicKey, ev.id);
  const { publisher, system } = useEventPublisher();
  const note = useNoteCreator(n => ({ show: n.show, replyTo: n.replyTo, update: n.update, quote: n.quote }));

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
      <FooterZapButton ev={ev} zaps={zaps} />
    </div>
  );
}
