import classNames from "classnames";
import React, { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";

import { Chat, ChatType, useChatSystems } from "@/chat";
import NoteTime from "@/Components/Event/Note/NoteTime";
import NoteToSelf from "@/Components/User/NoteToSelf";
import ProfileImage from "@/Components/User/ProfileImage";
import useLogin from "@/Hooks/useLogin";
import usePageDimensions from "@/Hooks/usePageDimensions";
import { ChatParticipantProfile } from "@/Pages/Messages/ChatParticipant";
import DmWindow from "@/Pages/Messages/DmWindow";
import NewChatWindow from "@/Pages/Messages/NewChatWindow";
import UnreadCount from "@/Pages/Messages/UnreadCount";

const TwoCol = 768;

export default function MessagesPage() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { id } = useParams();
  const { width: pageWidth } = usePageDimensions();

  const chats = useChatSystems();

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
            <ProfileImage key={v.id} pubkey={v.id} link="" showUsername={false} profile={v.profile} />
          ))}
          {cx.title ?? <FormattedMessage defaultMessage="Group Chat" />}
        </div>
      );
    }
  }

  function conversation(cx: Chat) {
    if (!login.publicKey) return null;
    const participants = cx.participants.map(a => a.id);
    if (participants.length === 1 && participants[0] === login.publicKey) return noteToSelf(cx);

    const isActive = cx.id === id;
    return (
      <div
        className={classNames("flex items-center p cursor-pointer justify-between", { active: isActive })}
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
    <div className="flex flex-1 md:h-screen md:overflow-hidden">
      {(pageWidth >= TwoCol || !id) && (
        <div className="overflow-y-auto md:h-screen p-1 w-full md:w-1/3 flex-shrink-0">
          <div className="flex items-center justify-between p-2">
            <button disabled={unreadCount <= 0} type="button" className="text-sm font-semibold">
              <FormattedMessage defaultMessage="Mark all read" />
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
      {id ? <DmWindow id={id} /> : pageWidth >= TwoCol && <div className="flex-1 rt-border"></div>}
    </div>
  );
}
