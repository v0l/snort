import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { HexKey, RawEvent } from "@snort/nostr";

import UnreadCount from "Element/UnreadCount";
import ProfileImage from "Element/ProfileImage";
import { dedupe, hexToBech32, unwrap } from "Util";
import NoteToSelf from "Element/NoteToSelf";
import useModeration from "Hooks/useModeration";
import { useDmCache } from "Hooks/useDmsCache";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

type DmChat = {
  pubkey: HexKey;
  unreadMessages: number;
  newestMessage: number;
};

export default function MessagesPage() {
  const login = useLogin();
  const { isMuted } = useModeration();
  const dms = useDmCache();

  const chats = useMemo(() => {
    if (login.publicKey) {
      return extractChats(
        dms.filter(a => !isMuted(a.pubkey)),
        login.publicKey
      );
    }
    return [];
  }, [dms, login.publicKey]);

  const unreadCount = useMemo(() => chats.reduce((p, c) => p + c.unreadMessages, 0), [chats]);

  function noteToSelf(chat: DmChat) {
    return (
      <div className="flex mb10" key={chat.pubkey}>
        <NoteToSelf
          clickable={true}
          className="f-grow"
          link={`/messages/${hexToBech32("npub", chat.pubkey)}`}
          pubkey={chat.pubkey}
        />
      </div>
    );
  }

  function person(chat: DmChat) {
    if (chat.pubkey === login.publicKey) return noteToSelf(chat);
    return (
      <div className="flex mb10" key={chat.pubkey}>
        <ProfileImage pubkey={chat.pubkey} className="f-grow" link={`/messages/${hexToBech32("npub", chat.pubkey)}`} />
        <UnreadCount unread={chat.unreadMessages} />
      </div>
    );
  }

  function markAllRead() {
    for (const c of chats) {
      setLastReadDm(c.pubkey);
    }
  }

  return (
    <div className="main-content">
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

function newestMessage(dms: RawEvent[], myPubKey: HexKey, pk: HexKey) {
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
