import React, { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import { NostrPrefix, TLVEntryType, decodeTLV } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import UnreadCount from "Element/UnreadCount";
import ProfileImage, { getDisplayName } from "Element/ProfileImage";
import { hexToBech32, parseId } from "SnortUtils";
import NoteToSelf from "Element/NoteToSelf";
import useModeration from "Hooks/useModeration";
import useLogin from "Hooks/useLogin";
import usePageWidth from "Hooks/usePageWidth";
import NoteTime from "Element/NoteTime";
import DmWindow from "Element/DmWindow";
import Avatar from "Element/Avatar";
import Icon from "Icons/Icon";
import Text from "Element/Text";
import { System } from "index";
import { Chat, ChatType, useChatSystem } from "chat";

import "./MessagesPage.css";
import messages from "./messages";

const TwoCol = 768;
const ThreeCol = 1500;

export default function MessagesPage() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { id } = useParams();
  const [chat, setChat] = useState<string>();
  const pageWidth = usePageWidth();

  useEffect(() => {
    const parsedId = parseId(id ?? "");
    setChat(id ? parsedId : undefined);
  }, [id]);
  const chats = useChatSystem();

  const unreadCount = useMemo(() => chats.reduce((p, c) => p + c.unread, 0), [chats]);

  function openChat(e: React.MouseEvent<HTMLDivElement>, type: ChatType, id: string) {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/messages/${encodeURIComponent(id)}`);
  }

  function noteToSelf(chat: Chat) {
    return (
      <div className="flex mb10" key={chat.id} onClick={e => openChat(e, chat.type, chat.id)}>
        <NoteToSelf clickable={true} className="f-grow" link="" pubkey={chat.id} />
      </div>
    );
  }

  function conversationIdent(chat: Chat) {
    if (chat.participants.length === 1) {
      const p = chat.participants[0];

      if (p.type === "pubkey") {
        return <ProfileImage pubkey={p.id} className="f-grow" link="" />;
      } else {
        return <ProfileImage pubkey={""} overrideUsername={p.id} className="f-grow" link="" />;
      }
    } else {
      return (
        <div className="flex f-grow pfp-overlap">
          {chat.participants.map(v => (
            <ProfileImage pubkey={v.id} link="" showUsername={false} />
          ))}
          <div className="f-grow">{chat.title}</div>
        </div>
      );
    }
  }

  function conversation(chat: Chat) {
    if (!login.publicKey) return null;
    const participants = chat.participants.map(a => a.id);
    if (participants.length === 1 && participants[0] === login.publicKey) return noteToSelf(chat);
    return (
      <div className="flex mb10" key={chat.id} onClick={e => openChat(e, chat.type, chat.id)}>
        {conversationIdent(chat)}
        <div className="nowrap">
          <small>
            <NoteTime from={chat.lastMessage * 1000} fallback={formatMessage({ defaultMessage: "Just now" })} />
          </small>
          {chat.unread > 0 && <UnreadCount unread={chat.unread} />}
        </div>
      </div>
    );
  }

  return (
    <div className="dm-page">
      {(pageWidth >= TwoCol || !chat) && (
        <div>
          <div className="flex">
            <h3 className="f-grow">
              <FormattedMessage {...messages.Messages} />
            </h3>
            <button disabled={unreadCount <= 0} type="button">
              <FormattedMessage {...messages.MarkAllRead} />
            </button>
          </div>
          {chats
            .sort((a, b) => {
              const aSelf = a.participants.length === 1 && a.participants[0].id === login.publicKey;
              const bSelf = b.participants.length === 1 && b.participants[0].id === login.publicKey;
              if (aSelf || bSelf) {
                return aSelf ? -1 : 1;
              }
              return b.lastMessage > a.lastMessage ? 1 : -1;
            })
            .map(conversation)}
        </div>
      )}
      {chat && <DmWindow id={chat} />}
      {pageWidth >= ThreeCol && chat && (
        <div>
          <ProfileDmActions id={chat} />
        </div>
      )}
    </div>
  );
}

function ProfileDmActions({ id }: { id: string }) {
  const authors = decodeTLV(id)
    .filter(a => a.type === TLVEntryType.Author)
    .map(a => a.value as string);
  const pubkey = authors[0];
  const profile = useUserProfile(System, pubkey);
  const { block, unblock, isBlocked } = useModeration();

  function truncAbout(s?: string) {
    if ((s?.length ?? 0) > 200) {
      return `${s?.slice(0, 200)}...`;
    }
    return s;
  }

  const blocked = isBlocked(pubkey);
  return (
    <>
      <Avatar user={profile} size={210} />
      <h2>{getDisplayName(profile, pubkey)}</h2>
      <p>
        <Text content={truncAbout(profile?.about) ?? ""} tags={[]} creator={pubkey} disableMedia={true} depth={0} />
      </p>

      <div className="settings-row" onClick={() => (blocked ? unblock(pubkey) : block(pubkey))}>
        <Icon name="block" />
        {blocked ? <FormattedMessage defaultMessage="Unblock" /> : <FormattedMessage defaultMessage="Block" />}
      </div>
    </>
  );
}
