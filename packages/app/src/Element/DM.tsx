import "./DM.css";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useInView } from "react-intersection-observer";
import { TaggedRawEvent } from "@snort/nostr";

import useEventPublisher from "Feed/EventPublisher";
import NoteTime from "Element/NoteTime";
import Text from "Element/Text";
import { setLastReadDm } from "Pages/MessagesPage";
import { unwrap } from "SnortUtils";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

export type DMProps = {
  data: TaggedRawEvent;
};

export default function DM(props: DMProps) {
  const pubKey = useLogin().publicKey;
  const publisher = useEventPublisher();
  const [content, setContent] = useState("Loading...");
  const [decrypted, setDecrypted] = useState(false);
  const { ref, inView } = useInView();
  const { formatMessage } = useIntl();
  const isMe = props.data.pubkey === pubKey;
  const otherPubkey = isMe ? pubKey : unwrap(props.data.tags.find(a => a[0] === "p")?.[1]);

  async function decrypt() {
    if (publisher) {
      const decrypted = await publisher.decryptDm(props.data);
      setContent(decrypted || "<ERROR>");
      if (!isMe) {
        setLastReadDm(props.data.pubkey);
      }
    }
  }

  useEffect(() => {
    if (!decrypted && inView) {
      setDecrypted(true);
      decrypt().catch(console.error);
    }
  }, [inView, props.data]);

  return (
    <div className={isMe ? "dm me" : "dm other"} ref={ref}>
      <div>
        <Text content={content} tags={[]} creator={otherPubkey} />
      </div>
      <div>
        <NoteTime from={props.data.created_at * 1000} fallback={formatMessage(messages.JustNow)} />
      </div>
    </div>
  );
}
