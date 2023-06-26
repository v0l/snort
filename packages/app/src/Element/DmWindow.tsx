import "./DmWindow.css";
import { useMemo } from "react";
import { TaggedRawEvent } from "@snort/system";

import ProfileImage from "Element/ProfileImage";
import DM from "Element/DM";
import NoteToSelf from "Element/NoteToSelf";
import useLogin from "Hooks/useLogin";
import WriteMessage from "Element/WriteMessage";
import { Chat, ChatType, useChatSystem } from "chat";
import { Nip4ChatSystem } from "chat/nip4";

export default function DmWindow({ id }: { id: string }) {
  const pubKey = useLogin().publicKey;
  const dms = useChatSystem();
  const chat = dms.find(a => a.id === id) ?? Nip4ChatSystem.createChatObj(id, []);

  function sender() {
    if (id === pubKey) {
      return <NoteToSelf className="f-grow mb-10" pubkey={id} />;
    }
    if (chat?.type === ChatType.DirectMessage) {
      return <ProfileImage pubkey={id} className="f-grow mb10" />;
    }
    if (chat?.profile) {
      return <ProfileImage pubkey={id} className="f-grow mb10" profile={chat.profile} />;
    }
    return <ProfileImage pubkey={id ?? ""} className="f-grow mb10" overrideUsername={chat?.id} />;
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
        <DM data={a as TaggedRawEvent} key={a.id} chat={chat} />
      ))}
    </>
  );
}
