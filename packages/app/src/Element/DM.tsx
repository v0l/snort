import "./DM.css";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useInView } from "react-intersection-observer";

import useEventPublisher from "Feed/EventPublisher";
import NoteTime from "Element/NoteTime";
import Text from "Element/Text";
import useLogin from "Hooks/useLogin";
import { Chat, ChatMessage, ChatType, setLastReadIn } from "chat";

import messages from "./messages";
import ProfileImage from "./ProfileImage";

export interface DMProps {
  chat: Chat;
  data: ChatMessage;
}

export default function DM(props: DMProps) {
  const pubKey = useLogin().publicKey;
  const publisher = useEventPublisher();
  const msg = props.data;
  const [content, setContent] = useState(msg.needsDecryption ? "Loading..." : msg.content);
  const [decrypted, setDecrypted] = useState(false);
  const { ref, inView } = useInView();
  const { formatMessage } = useIntl();
  const isMe = msg.from === pubKey;
  const otherPubkey = isMe ? pubKey : msg.from;

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
    if (!decrypted && inView && msg.needsDecryption) {
      setDecrypted(true);
      decrypt().catch(console.error);
    }
  }, [inView, msg]);

  return (
    <div className={isMe ? "dm me" : "dm other"} ref={ref}>
      <div>
        {sender()}
        <Text id={msg.id} content={content} tags={[]} creator={otherPubkey} />
      </div>
      <div>
        <NoteTime from={msg.created_at * 1000} fallback={formatMessage(messages.JustNow)} />
      </div>
    </div>
  );
}
