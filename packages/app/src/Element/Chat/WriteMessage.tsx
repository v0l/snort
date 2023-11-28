import { useState } from "react";
import useEventPublisher from "@/Hooks/useEventPublisher";
import Textarea from "../Textarea";
import { Chat } from "@/chat";
import { AsyncIcon } from "@/Element/Button/AsyncIcon";

export default function WriteMessage({ chat }: { chat: Chat }) {
  const [msg, setMsg] = useState("");
  const { publisher, system } = useEventPublisher();

  async function sendMessage() {
    if (msg && publisher && chat) {
      const ev = await chat.createMessage(msg, publisher);
      await chat.sendMessage(ev, system);
      setMsg("");
    }
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMsg(e.target.value);
  }

  async function onEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isEnter = e.code === "Enter";
    if (isEnter && !e.shiftKey) {
      e.preventDefault();
      await sendMessage();
    }
  }

  return (
    <>
      <div className="grow">
        <Textarea
          autoFocus={true}
          placeholder=""
          className=""
          value={msg}
          onChange={e => onChange(e)}
          onKeyDown={e => onEnter(e)}
          onFocus={() => {
            // ignored
          }}
        />
      </div>
      <AsyncIcon className="circle flex items-center button" iconName="arrow-right" onClick={() => sendMessage()} />
    </>
  );
}
