import React, { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import { NostrPrefix } from "@snort/system";
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
  const parsedId = parseId(id ?? "");
  const [chat, setChat] = useState(id ? parsedId : undefined);
  const pageWidth = usePageWidth();

  const chats = useChatSystem();

  const unreadCount = useMemo(() => chats.reduce((p, c) => p + c.unread, 0), [chats]);

  function openChat(e: React.MouseEvent<HTMLDivElement>, pubkey: string) {
    e.stopPropagation();
    e.preventDefault();
    if (pageWidth < TwoCol) {
      navigate(`/messages/${hexToBech32(NostrPrefix.PublicKey, pubkey)}`);
    } else {
      setChat(pubkey);
    }
  }

  function noteToSelf(chat: Chat) {
    return (
      <div className="flex mb10" key={chat.id} onClick={e => openChat(e, chat.id)}>
        <NoteToSelf clickable={true} className="f-grow" link="" pubkey={chat.id} />
      </div>
    );
  }

  function person(chat: Chat) {
    if (!login.publicKey) return null;
    if (chat.id === login.publicKey) return noteToSelf(chat);
    return (
      <div className="flex mb10" key={chat.id} onClick={e => openChat(e, chat.id)}>
        {chat.type === ChatType.DirectMessage ? (
          <ProfileImage pubkey={chat.id} className="f-grow" link="" />
        ) : (
          <ProfileImage pubkey={chat.id} overrideUsername={chat.id} className="f-grow" link="" />
        )}
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
            return a.id === login.publicKey ? -1 : b.id === login.publicKey ? 1 : b.lastMessage - a.lastMessage;
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
