import "./DM.css";

import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useInView } from "react-intersection-observer";

import useEventPublisher from "@/Hooks/useEventPublisher";
import NoteTime from "@/Components/Event/NoteTime";
import Text from "@/Components/Text/Text";
import useLogin from "@/Hooks/useLogin";
import { Chat, ChatMessage, ChatType, setLastReadIn } from "@/chat";
import ProfileImage from "@/Components/User/ProfileImage";

import messages from "@/Components/messages";

export interface DMProps {
  chat: Chat;
  data: ChatMessage;
}

export default function DM(props: DMProps) {
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const { publisher } = useEventPublisher();
  const msg = props.data;
  const [content, setContent] = useState<string>();
  const { ref, inView } = useInView({ triggerOnce: true });
  const { formatMessage } = useIntl();
  const isMe = msg.from === publicKey;
  const otherPubkey = isMe ? publicKey : msg.from;

  async function decrypt() {
    if (publisher) {
      const decrypted = await msg.decrypt(publisher);
      setContent(decrypted || "<ERROR>");
      if (!isMe) {
        setLastReadIn(msg.id);
      }
    }
  }

  function sender() {
    const isGroup = props.chat.type === ChatType.PrivateGroupChat || props.chat.type === ChatType.PublicGroupChat;
    if (isGroup && !isMe) {
      return <ProfileImage pubkey={msg.from} />;
    }
  }

  useEffect(() => {
    if (inView) {
      if (msg.needsDecryption) {
        decrypt().catch(console.error);
      } else {
        setContent(msg.content);
      }
    }
  }, [inView]);

  return (
    <div
      className={
        isMe
          ? "self-end mt-4 min-w-[100px] max-w-[90%] whitespace-pre-wrap align-self-end"
          : "mt-4 min-w-[100px] max-w-[90%] whitespace-pre-wrap"
      }
      ref={ref}>
      <div
        className={
          isMe
            ? "p-3 dm-gradient rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none"
            : "p-3 bg-gray-300 rounded-tl-lg rounded-tr-lg rounded-br-lg rounded-bl-none other"
        }>
        {sender()}
        {content ? (
          <Text id={msg.id} content={content} tags={[]} creator={otherPubkey} />
        ) : (
          <FormattedMessage defaultMessage="Loading..." id="gjBiyj" />
        )}
      </div>
      <div className={isMe ? "text-end text-gray-400 text-sm mt-1" : "text-gray-400 text-sm mt-1"}>
        <NoteTime from={msg.created_at * 1000} fallback={formatMessage(messages.JustNow)} />
      </div>
    </div>
  );
}
