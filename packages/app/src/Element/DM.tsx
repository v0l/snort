import "./DM.css";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useInView } from "react-intersection-observer";
import { EventKind, TaggedRawEvent } from "@snort/system";

import useEventPublisher from "Feed/EventPublisher";
import NoteTime from "Element/NoteTime";
import Text from "Element/Text";
import useLogin from "Hooks/useLogin";
import { Chat, ChatType, chatTo, setLastReadIn } from "chat";

import messages from "./messages";
import ProfileImage from "./ProfileImage";

export interface DMProps {
  chat: Chat;
  data: TaggedRawEvent;
}

export default function DM(props: DMProps) {
  const pubKey = useLogin().publicKey;
  const publisher = useEventPublisher();
  const ev = props.data;
  const needsDecryption = ev.kind === EventKind.DirectMessage;
  const [content, setContent] = useState(needsDecryption ? "Loading..." : ev.content);
  const [decrypted, setDecrypted] = useState(false);
  const { ref, inView } = useInView();
  const { formatMessage } = useIntl();
  const isMe = ev.pubkey === pubKey;
  const otherPubkey = isMe ? pubKey : chatTo(ev);

  async function decrypt() {
    if (publisher) {
      const decrypted = await publisher.decryptDm(ev);
      setContent(decrypted || "<ERROR>");
      if (!isMe) {
        setLastReadIn(ev.pubkey);
      }
    }
  }

  function sender() {
    if (props.chat.type !== ChatType.DirectMessage && !isMe) {
      return <ProfileImage pubkey={ev.pubkey} />;
    }
  }

  useEffect(() => {
    if (!decrypted && inView && needsDecryption) {
      setDecrypted(true);
      decrypt().catch(console.error);
    }
  }, [inView, ev]);

  return (
    <div className={isMe ? "dm me" : "dm other"} ref={ref}>
      <div>
        {sender()}
        <Text content={content} tags={[]} creator={otherPubkey} />
      </div>
      <div>
        <NoteTime from={ev.created_at * 1000} fallback={formatMessage(messages.JustNow)} />
      </div>
    </div>
  );
}
