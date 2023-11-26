import "./MessagesPage.css";

import React, { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import UnreadCount from "@/Element/UnreadCount";
import ProfileImage from "@/Element/User/ProfileImage";
import { parseId } from "@/SnortUtils";
import NoteToSelf from "@/Element/User/NoteToSelf";
import useLogin from "@/Hooks/useLogin";
import usePageWidth from "@/Hooks/usePageWidth";
import NoteTime from "@/Element/Event/NoteTime";
import DmWindow from "@/Element/Chat/DmWindow";
import { Chat, ChatType, useChatSystem } from "@/chat";
import { ChatParticipantProfile } from "@/Element/Chat/ChatParticipant";
import classNames from "classnames";
import ProfileDmActions from "@/Pages/Messages/ProfileDmActions";
import NewChatWindow from "@/Pages/Messages/NewChatWindow";

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
      <div className="flex p" key={chat.id} onClick={e => openChat(e, chat.type, chat.id)}>
        <NoteToSelf className="grow" />
      </div>
    );
  }

  function conversationIdent(cx: Chat) {
    if (cx.participants.length === 1) {
      return <ChatParticipantProfile participant={cx.participants[0]} />;
    } else {
      return (
        <div className="flex items-center grow pfp-overlap">
          {cx.participants.map(v => (
            <ProfileImage pubkey={v.id} link="" showUsername={false} profile={v.profile} />
          ))}
          {cx.title ?? <FormattedMessage defaultMessage="Group Chat" id="eXT2QQ" />}
        </div>
      );
    }
  }

  function conversation(cx: Chat) {
    if (!login.publicKey) return null;
    const participants = cx.participants.map(a => a.id);
    if (participants.length === 1 && participants[0] === login.publicKey) return noteToSelf(cx);

    const isActive = cx.id === chat;
    return (
      <div
        className={classNames("flex items-center p", { active: isActive })}
        key={cx.id}
        onClick={e => openChat(e, cx.type, cx.id)}>
        {conversationIdent(cx)}
        <div className="nowrap">
          <small>
            <NoteTime
              from={cx.lastMessage * 1000}
              fallback={formatMessage({ defaultMessage: "Just now", id: "bxv59V" })}
            />
          </small>
          {cx.unread > 0 && <UnreadCount unread={cx.unread} />}
        </div>
      </div>
    );
  }

  return (
    <div className="dm-page">
      {(pageWidth >= TwoCol || !chat) && (
        <div className="chat-list">
          <div className="flex items-center p justify-between">
            <button disabled={unreadCount <= 0} type="button">
              <FormattedMessage defaultMessage="Mark all read" id="ShdEie" />
            </button>
            <NewChatWindow />
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
      {chat ? <DmWindow id={chat} /> : pageWidth >= TwoCol && <div></div>}
      {pageWidth >= ThreeCol && chat && (
        <div>
          <ProfileDmActions id={chat} />
        </div>
      )}
    </div>
  );
}
