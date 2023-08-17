import "./LiveChat.css";
import { EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";

import Textarea from "Element/Textarea";
import { useLiveChatFeed } from "Feed/LiveChatFeed";
import useEventPublisher from "Feed/EventPublisher";
import { getDisplayName } from "Element/ProfileImage";
import Avatar from "Element/Avatar";
import AsyncButton from "Element/AsyncButton";
import Text from "Element/Text";
import { System } from "index";
import { profileLink } from "SnortUtils";

export function LiveChat({ ev, link }: { ev: TaggedNostrEvent; link: NostrLink }) {
  const [chat, setChat] = useState("");
  const messages = useLiveChatFeed(link);
  const pub = useEventPublisher();
  const { formatMessage } = useIntl();

  async function sendChatMessage() {
    if (chat.length > 1) {
      const reply = await pub?.generic(eb => {
        return eb
          .kind(1311 as EventKind)
          .content(chat)
          .tag(["a", `${link.kind}:${link.author}:${link.id}`])
          .processContent();
      });
      if (reply) {
        console.debug(reply);
        System.BroadcastEvent(reply);
      }
      setChat("");
    }
  }
  return (
    <div className="live-chat">
      <div>
        <FormattedMessage defaultMessage="Stream Chat" />
      </div>
      <div>
        {[...(messages.data ?? [])]
          .sort((a, b) => b.created_at - a.created_at)
          .map(a => (
            <ChatMessage ev={a} key={a.id} />
          ))}
      </div>
      <div>
        <Textarea
          autoFocus={false}
          className=""
          onChange={v => setChat(v.target.value)}
          value={chat}
          onFocus={() => {}}
          placeholder={formatMessage({
            defaultMessage: "Message...",
          })}
          onKeyDown={async e => {
            if (e.code === "Enter") {
              e.preventDefault();
              await sendChatMessage();
            }
          }}
        />
        <AsyncButton onClick={sendChatMessage}>
          <FormattedMessage defaultMessage="Send" />
        </AsyncButton>
      </div>
    </div>
  );
}

function ChatMessage({ ev }: { ev: TaggedNostrEvent }) {
  const profile = useUserProfile(System, ev.pubkey);
  const navigate = useNavigate();

  return (
    <div className="message">
      <div className="name" onClick={() => navigate(profileLink(ev.pubkey, ev.relays))}>
        <Avatar user={profile} />
        {getDisplayName(profile, ev.pubkey)}:
      </div>
      <span>
        <Text disableMedia={true} content={ev.content} creator={ev.pubkey} tags={ev.tags} />
      </span>
    </div>
  );
}
