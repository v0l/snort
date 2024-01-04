import { useEffect, useMemo, useRef } from "react";
import { FormattedMessage } from "react-intl";

import { Chat, createEmptyChatObject, useChatSystem } from "@/chat";
import ProfileImage from "@/Components/User/ProfileImage";
import useLogin from "@/Hooks/useLogin";
import DM from "@/Pages/Messages/DM";
import WriteMessage from "@/Pages/Messages/WriteMessage";

import { ChatParticipantProfile } from "./ChatParticipant";

export default function DmWindow({ id }: { id: string }) {
  const dms = useChatSystem();
  const chat = dms.find(a => a.id === id) ?? createEmptyChatObject(id);

  function sender() {
    if (chat.participants.length === 1) {
      return <ChatParticipantProfile participant={chat.participants[0]} />;
    } else {
      return (
        <div className="flex -space-x-5 mb-2.5">
          {chat.participants.map(v => (
            <ProfileImage key={v.id} pubkey={v.id} showUsername={false} />
          ))}
          {chat.title ?? <FormattedMessage defaultMessage="Secret Group Chat" id="+Vxixo" />}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-62px)] md:h-screen">
      <div className="p-3">{sender()}</div>
      <div className="overflow-y-auto hide-scrollbar p-2.5 flex-grow">
        <div className="flex flex-col">{chat && <DmChatSelected chat={chat} />}</div>
      </div>
      <div className="flex items-center gap-2.5 p-2.5">
        <WriteMessage chat={chat} />
      </div>
    </div>
  );
}

function DmChatSelected({ chat }: { chat: Chat }) {
  const { publicKey: myPubKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sortedDms = useMemo(() => {
    const myDms = chat?.messages;
    if (myPubKey && myDms) {
      // filter dms in this chat, or dms to self
      return [...myDms].sort((a, b) => a.created_at - b.created_at);
    }
    return [];
  }, [chat, myPubKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      scrollToBottom();
    });

    // Start observing the element that you want to keep in view
    if (messagesContainerRef.current) {
      observer.observe(messagesContainerRef.current);
    }

    // Make sure to scroll to bottom on initial load
    scrollToBottom();

    // Clean up the observer on component unmount
    return () => {
      if (messagesContainerRef.current) {
        observer.unobserve(messagesContainerRef.current);
      }
    };
  }, [sortedDms]);

  return (
    <div className="flex flex-col" ref={messagesContainerRef}>
      {sortedDms.map(a => (
        <DM data={a} key={a.id} chat={chat} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
