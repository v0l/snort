import "./DmWindow.css";
import { useMemo } from "react";

import ProfileImage from "Element/ProfileImage";
import DM from "Element/DM";
import NoteToSelf from "Element/NoteToSelf";
import useLogin from "Hooks/useLogin";
import WriteMessage from "Element/WriteMessage";
import { Chat, ChatParticipant, useChatSystem } from "chat";
import { Nip4ChatSystem } from "chat/nip4";
import { FormattedMessage } from "react-intl";

export default function DmWindow({ id }: { id: string }) {
  const pubKey = useLogin().publicKey;
  const dms = useChatSystem();
  const chat = dms.find(a => a.id === id) ?? Nip4ChatSystem.createChatObj(id, []);

  function participant(p: ChatParticipant) {
    if (p.id === pubKey) {
      return <NoteToSelf className="f-grow mb-10" pubkey={p.id} />;
    }
    if (p.type === "pubkey") {
      return <ProfileImage pubkey={p.id} className="f-grow mb10" />;
    }
    if (p?.profile) {
      return <ProfileImage pubkey={p.id} className="f-grow mb10" profile={p.profile} />;
    }
    return <ProfileImage pubkey={p.id} className="f-grow mb10" overrideUsername={p.id} />;
  }

  function sender() {
    if (chat.participants.length === 1) {
      return participant(chat.participants[0]);
    } else {
      return (
        <div className="flex pfp-overlap mb10">
          {chat.participants.map(v => (
            <ProfileImage pubkey={v.id} showUsername={false} />
          ))}
          {chat.title ?? <FormattedMessage defaultMessage="Group Chat" />}
        </div>
      );
    }
  }

  return (
    <div className="dm-window">
      <div>{sender()}</div>
      <div>
        <div className="flex f-col">{chat && <DmChatSelected chat={chat} />}</div>
      </div>
      <div>
        <WriteMessage chat={chat} />
      </div>
    </div>
  );
}

function DmChatSelected({ chat }: { chat: Chat }) {
  const { publicKey: myPubKey } = useLogin();
  const sortedDms = useMemo(() => {
    const myDms = chat?.messages;
    if (myPubKey && myDms) {
      // filter dms in this chat, or dms to self
      return [...myDms].sort((a, b) => a.created_at - b.created_at);
    }
    return [];
  }, [chat, myPubKey]);

  return (
    <>
      {sortedDms.map(a => (
        <DM data={a} key={a.id} chat={chat} />
      ))}
    </>
  );
}
