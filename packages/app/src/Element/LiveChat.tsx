import "./LiveChat.css";
import { NostrLink, TaggedRawEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useState } from "react";
import Textarea from "./Textarea";
import { useLiveChatFeed } from "Feed/LiveChatFeed";
import useEventPublisher from "Feed/EventPublisher";
import { System } from "index";
import { getDisplayName } from "Element/ProfileImage";

export function LiveChat({ ev, link }: { ev: TaggedRawEvent; link: NostrLink }) {
  const [chat, setChat] = useState("");
  const messages = useLiveChatFeed(link);
  const pub = useEventPublisher();

  async function sendChatMessage() {
    const reply = await pub?.note(chat, eb => {
      return eb.tag(["a", `${link.kind}:${link.author}:${link.id}`]);
    });
    if (reply) {
      console.debug(reply);
      System.BroadcastEvent(reply);
    }
    setChat("");
  }
  return (
    <div className="live-chat">
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
          placeholder=""
          onKeyDown={async e => {
            if (e.code === "Enter") {
              await sendChatMessage();
            }
          }}
        />
      </div>
    </div>
  );
}

function ChatMessage({ ev }: { ev: TaggedRawEvent }) {
  const profile = useUserProfile(System, ev.pubkey);
  return (
    <div>
      <b>{getDisplayName(profile, ev.pubkey)}</b>
      :&nbsp;
      {ev.content}
    </div>
  );
}
