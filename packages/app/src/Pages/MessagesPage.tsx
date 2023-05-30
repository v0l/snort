import React, { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { HexKey, RawEvent, NostrPrefix } from "System";

import UnreadCount from "Element/UnreadCount";
import ProfileImage, { getDisplayName } from "Element/ProfileImage";
import { dedupe, hexToBech32, unwrap } from "SnortUtils";
import NoteToSelf from "Element/NoteToSelf";
import useModeration from "Hooks/useModeration";
import { useDmCache } from "Hooks/useDmsCache";
import useLogin from "Hooks/useLogin";
import usePageWidth from "Hooks/usePageWidth";
import NoteTime from "Element/NoteTime";
import DmWindow from "Element/DmWindow";
import Avatar from "Element/Avatar";
import { useUserProfile } from "Hooks/useUserProfile";
import Icon from "Icons/Icon";
import Text from "Element/Text";

import "./MessagesPage.css";
import messages from "./messages";

const TwoCol = 768;
const ThreeCol = 1500;

type DmChat = {
  pubkey: HexKey;
  unreadMessages: number;
  newestMessage: number;
};

export default function MessagesPage() {
  const login = useLogin();
  const { isMuted } = useModeration();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const dms = useDmCache();
  const [chat, setChat] = useState<string>();
  const pageWidth = usePageWidth();

  const chats = useMemo(() => {
    if (login.publicKey) {
      return extractChats(
        dms.filter(a => !isMuted(a.pubkey)),
        login.publicKey
      );
    }
    return [];
  }, [dms, login.publicKey, isMuted]);

  const unreadCount = useMemo(() => chats.reduce((p, c) => p + c.unreadMessages, 0), [chats]);

  function openChat(e: React.MouseEvent<HTMLDivElement>, pubkey: string) {
    e.stopPropagation();
    e.preventDefault();
    if (pageWidth < TwoCol) {
      navigate(`/messages/${hexToBech32(NostrPrefix.PublicKey, pubkey)}`);
    } else {
      setChat(pubkey);
    }
  }

  function noteToSelf(chat: DmChat) {
    return (
      <div className="flex mb10" key={chat.pubkey} onClick={e => openChat(e, chat.pubkey)}>
        <NoteToSelf clickable={true} className="f-grow" link="" pubkey={chat.pubkey} />
      </div>
    );
  }

  function person(chat: DmChat) {
    if (!login.publicKey) return null;
    if (chat.pubkey === login.publicKey) return noteToSelf(chat);
    return (
      <div className="flex mb10" key={chat.pubkey} onClick={e => openChat(e, chat.pubkey)}>
        <ProfileImage pubkey={chat.pubkey} className="f-grow" link="" />
        <div className="nowrap">
          <small>
            <NoteTime
              from={newestMessage(dms, login.publicKey, chat.pubkey) * 1000}
              fallback={formatMessage({ defaultMessage: "Just now" })}
            />
          </small>
          {chat.unreadMessages > 0 && <UnreadCount unread={chat.unreadMessages} />}
        </div>
      </div>
    );
  }

  function markAllRead() {
    for (const c of chats) {
      setLastReadDm(c.pubkey);
    }
  }

  return (
    <div className="dm-page">
      <div>
        <div className="flex">
          <h3 className="f-grow">
            <FormattedMessage {...messages.Messages} />
          </h3>
          <button disabled={unreadCount <= 0} type="button" onClick={() => markAllRead()}>
            <FormattedMessage {...messages.MarkAllRead} />
          </button>
        </div>
        {chats
          .sort((a, b) => {
            return a.pubkey === login.publicKey
              ? -1
              : b.pubkey === login.publicKey
              ? 1
              : b.newestMessage - a.newestMessage;
          })
          .map(person)}
      </div>
      {pageWidth >= TwoCol && chat && <DmWindow id={chat} />}
      {pageWidth >= ThreeCol && chat && (
        <div>
          <ProfileDmActions pubkey={chat} />
        </div>
      )}
    </div>
  );
}

function ProfileDmActions({ pubkey }: { pubkey: string }) {
  const profile = useUserProfile(pubkey);
  const { block, unblock, isBlocked } = useModeration();

  const blocked = isBlocked(pubkey);
  return (
    <>
      <Avatar user={profile} size={210} />
      <h2>{getDisplayName(profile, pubkey)}</h2>
      <p>
        <Text content={profile?.about ?? ""} tags={[]} creator={pubkey} disableMedia={true} depth={0} />
      </p>

      <div className="settings-row" onClick={() => (blocked ? unblock(pubkey) : block(pubkey))}>
        <Icon name="block" />
        {blocked ? <FormattedMessage defaultMessage="Unblock" /> : <FormattedMessage defaultMessage="Block" />}
      </div>
    </>
  );
}

export function lastReadDm(pk: HexKey) {
  const k = `dm:seen:${pk}`;
  return parseInt(window.localStorage.getItem(k) ?? "0");
}

export function setLastReadDm(pk: HexKey) {
  const now = Math.floor(new Date().getTime() / 1000);
  const current = lastReadDm(pk);
  if (current >= now) {
    return;
  }

  const k = `dm:seen:${pk}`;
  window.localStorage.setItem(k, now.toString());
}

export function dmTo(e: RawEvent) {
  const firstP = e.tags.find(b => b[0] === "p");
  return unwrap(firstP?.[1]);
}

export function isToSelf(e: Readonly<RawEvent>, pk: HexKey) {
  return e.pubkey === pk && dmTo(e) === pk;
}

export function dmsInChat(dms: readonly RawEvent[], pk: HexKey) {
  return dms.filter(a => a.pubkey === pk || dmTo(a) === pk);
}

export function totalUnread(dms: RawEvent[], myPubKey: HexKey) {
  return extractChats(dms, myPubKey).reduce((acc, v) => (acc += v.unreadMessages), 0);
}

function unreadDms(dms: RawEvent[], myPubKey: HexKey, pk: HexKey) {
  if (pk === myPubKey) return 0;
  const lastRead = lastReadDm(pk);
  return dmsInChat(dms, pk).filter(a => a.created_at >= lastRead && a.pubkey !== myPubKey).length;
}

function newestMessage(dms: readonly RawEvent[], myPubKey: HexKey, pk: HexKey) {
  if (pk === myPubKey) {
    return dmsInChat(
      dms.filter(d => isToSelf(d, myPubKey)),
      pk
    ).reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0);
  }

  return dmsInChat(dms, pk).reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0);
}

export function dmsForLogin(dms: readonly RawEvent[], myPubKey: HexKey) {
  return dms.filter(a => a.pubkey === myPubKey || (a.pubkey !== myPubKey && dmTo(a) === myPubKey));
}

export function extractChats(dms: RawEvent[], myPubKey: HexKey) {
  const myDms = dmsForLogin(dms, myPubKey);
  const keys = myDms.map(a => [a.pubkey, dmTo(a)]).flat();
  const filteredKeys = dedupe(keys);
  return filteredKeys.map(a => {
    return {
      pubkey: a,
      unreadMessages: unreadDms(myDms, myPubKey, a),
      newestMessage: newestMessage(myDms, myPubKey, a),
    } as DmChat;
  });
}
