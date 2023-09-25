import "./MessagesPage.css";

import React, { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import { NostrLink, NostrPrefix, TLVEntryType, UserMetadata, decodeTLV } from "@snort/system";
import { useUserProfile, useUserSearch } from "@snort/system-react";

import UnreadCount from "Element/UnreadCount";
import ProfileImage, { getDisplayName } from "Element/ProfileImage";
import { appendDedupe, debounce, parseId } from "SnortUtils";
import NoteToSelf from "Element/NoteToSelf";
import useModeration from "Hooks/useModeration";
import useLogin from "Hooks/useLogin";
import usePageWidth from "Hooks/usePageWidth";
import NoteTime from "Element/NoteTime";
import DmWindow from "Element/DmWindow";
import Avatar from "Element/Avatar";
import Icon from "Icons/Icon";
import Text from "Element/Text";
import { Chat, ChatType, createChatLink, useChatSystem } from "chat";
import Modal from "Element/Modal";
import ProfilePreview from "Element/ProfilePreview";
import { useEventFeed } from "Feed/EventFeed";
import { LoginSession, LoginStore } from "Login";
import { Nip28ChatSystem } from "chat/nip28";
import { ChatParticipantProfile } from "Element/ChatParticipant";

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
        <NoteToSelf clickable={true} className="f-grow" link="" pubkey={chat.id} />
      </div>
    );
  }

  function conversationIdent(cx: Chat) {
    if (cx.participants.length === 1) {
      return <ChatParticipantProfile participant={cx.participants[0]} />;
    } else {
      return (
        <div className="flex f-grow pfp-overlap">
          {cx.participants.map(v => (
            <ProfileImage pubkey={v.id} link="" showUsername={false} profile={v.profile} />
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

    const isActive = cx.id === chat;
    return (
      <div className={`flex p${isActive ? " active" : ""}`} key={cx.id} onClick={e => openChat(e, cx.type, cx.id)}>
        {conversationIdent(cx)}
        <div className="nowrap">
          <small>
            <NoteTime from={cx.lastMessage * 1000} fallback={formatMessage({ defaultMessage: "Just now" })} />
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
          <div className="flex p f-space">
            <button disabled={unreadCount <= 0} type="button">
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
      {chat ? <DmWindow id={chat} /> : pageWidth >= TwoCol && <div></div>}
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
  const profile = useUserProfile(pubkey);
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
      <Avatar pubkey={pubkey} user={profile} size={210} />
      <h2>{getDisplayName(profile, pubkey)}</h2>
      <p>
        <Text
          id={pubkey}
          content={truncAbout(profile?.about) ?? ""}
          tags={[]}
          creator={pubkey}
          disableMedia={true}
          depth={0}
        />
      </p>

      <div className="settings-row" onClick={() => (blocked ? unblock(pubkey) : block(pubkey))}>
        <Icon name="block" />
        {blocked ? <FormattedMessage defaultMessage="Unblock" /> : <FormattedMessage defaultMessage="Block" />}
      </div>
    </>
  );
}

function NewChatWindow() {
  const [show, setShow] = useState(false);
  const [newChat, setNewChat] = useState<Array<string>>([]);
  const [results, setResults] = useState<Array<string>>([]);
  const [term, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const search = useUserSearch();
  const login = useLogin();

  useEffect(() => {
    setNewChat([]);
    setSearchTerm("");
    setResults(login.follows.item);
  }, [show]);

  useEffect(() => {
    return debounce(500, () => {
      if (term) {
        search(term).then(setResults);
      } else {
        setResults(login.follows.item);
      }
    });
  }, [term]);

  function togglePubkey(a: string) {
    setNewChat(c => (c.includes(a) ? c.filter(v => v !== a) : appendDedupe(c, [a])));
  }

  function startChat() {
    setShow(false);
    if (newChat.length === 1) {
      navigate(createChatLink(ChatType.DirectMessage, newChat[0]));
    } else {
      navigate(createChatLink(ChatType.PrivateGroupChat, ...newChat));
    }
  }

  return (
    <>
      <button type="button" className="new-chat" onClick={() => setShow(true)}>
        <Icon name="plus" size={16} />
      </button>
      {show && (
        <Modal id="new-chat" onClose={() => setShow(false)} className="new-chat-modal">
          <div className="flex-column g16">
            <div className="flex f-space">
              <h2>
                <FormattedMessage defaultMessage="New Chat" />
              </h2>
              <button onClick={startChat}>
                <FormattedMessage defaultMessage="Start chat" />
              </button>
            </div>
            <div className="flex-column g8">
              <h3>
                <FormattedMessage defaultMessage="Search users" />
              </h3>
              <input
                type="text"
                placeholder="npub/nprofile/nostr address"
                value={term}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex">
              {newChat.map(a => (
                <ProfileImage
                  key={`selected-${a}`}
                  pubkey={a}
                  showUsername={false}
                  link=""
                  onClick={() => togglePubkey(a)}
                />
              ))}
            </div>
            <div>
              <p>
                <FormattedMessage defaultMessage="People you follow" />
              </p>
              <div className="user-list flex-column g2">
                {results.map(a => {
                  return (
                    <ProfilePreview
                      pubkey={a}
                      key={`option-${a}`}
                      options={{ about: false, linkToProfile: false }}
                      actions={<></>}
                      onClick={() => togglePubkey(a)}
                      className={newChat.includes(a) ? "active" : undefined}
                    />
                  );
                })}
                {results.length === 1 && (
                  <Nip28ChatProfile
                    id={results[0]}
                    onClick={id => {
                      setShow(false);
                      LoginStore.updateSession({
                        ...login,
                        extraChats: appendDedupe(login.extraChats, [Nip28ChatSystem.chatId(id)]),
                      } as LoginSession);
                      navigate(createChatLink(ChatType.PublicGroupChat, id));
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Nip28ChatProfile({ id, onClick }: { id: string; onClick: (id: string) => void }) {
  const channel = useEventFeed(new NostrLink(NostrPrefix.Event, id, 40));
  if (channel?.data) {
    const meta = JSON.parse(channel.data.content) as UserMetadata;
    return (
      <ProfilePreview
        pubkey=""
        profile={meta}
        options={{ about: false, linkToProfile: false }}
        actions={<></>}
        onClick={() => onClick(id)}
      />
    );
  }
}
