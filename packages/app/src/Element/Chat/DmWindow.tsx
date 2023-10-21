import "./DmWindow.css";
import { useMemo } from "react";

import ProfileImage from "Element/User/ProfileImage";
import DM from "Element/Chat/DM";
import useLogin from "Hooks/useLogin";
import WriteMessage from "Element/Chat/WriteMessage";
import { Chat, createEmptyChatObject, useChatSystem } from "chat";
import { FormattedMessage } from "react-intl";
import { ChatParticipantProfile } from "./ChatParticipant";

export default function DmWindow({ id }: { id: string }) {
  const dms = useChatSystem();
  const chat = dms.find(a => a.id === id) ?? createEmptyChatObject(id);

  function sender() {
    if (chat.participants.length === 1) {
      return <ChatParticipantProfile participant={chat.participants[0]} />;
    } else {
      return (
        <div className="flex pfp-overlap mb10">
          {chat.participants.map(v => (
            <ProfileImage pubkey={v.id} showUsername={false} />
          ))}
          {chat.title ?? <FormattedMessage defaultMessage="Secret Group Chat" />}
        </div>
      );
    }
  }

  return (
    <div className="dm-window">
      <div>{sender()}</div>
      <div>
        <div className="flex flex-col">{chat && <DmChatSelected chat={chat} />}</div>
      </div>
      <div className="flex g8">
        <WriteMessage chat={chat} />
      </div>
    </div>
  );
}

function DmChatSelected({ chat }: { chat: Chat }) {
  const { publicKey: myPubKey } = useLogin(s => ({ publicKey: s.publicKey }));
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
