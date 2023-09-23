import "./DM.css";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useInView } from "react-intersection-observer";

import useEventPublisher from "Hooks/useEventPublisher";
import NoteTime from "Element/NoteTime";
import Text from "Element/Text";
import useLogin from "Hooks/useLogin";
import { Chat, ChatMessage, ChatType, setLastReadIn } from "chat";
import ProfileImage from "./ProfileImage";

import messages from "./messages";

export interface DMProps {
  chat: Chat;
  data: ChatMessage;
}

export default function DM(props: DMProps) {
  const { publicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const publisher = useEventPublisher();
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
    <div className={isMe ? "dm me" : "dm other"} ref={ref}>
      <div>
        {sender()}
        {content ? (
          <Text id={msg.id} content={content} tags={[]} creator={otherPubkey} />
        ) : (
          <FormattedMessage defaultMessage="Loading..." />
        )}
      </div>
      <div>
        <NoteTime from={msg.created_at * 1000} fallback={formatMessage(messages.JustNow)} />
      </div>
    </div>
  );
}
