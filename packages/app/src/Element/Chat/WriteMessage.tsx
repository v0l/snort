import { useState } from "react";
import { NostrEvent, NostrLink, NostrPrefix } from "@snort/system";
import useEventPublisher from "Hooks/useEventPublisher";
import useFileUpload from "Upload";
import { openFile } from "SnortUtils";
import Textarea from "../Textarea";
import { Chat } from "chat";
import { AsyncIcon } from "Element/AsyncIcon";

export default function WriteMessage({ chat }: { chat: Chat }) {
  const [msg, setMsg] = useState("");
  const [otherEvents, setOtherEvents] = useState<Array<NostrEvent>>([]);
  const [error, setError] = useState("");
  const { publisher, system } = useEventPublisher();
  const uploader = useFileUpload();

  async function attachFile() {
    try {
      const file = await openFile();
      if (file) {
        uploadFile(file);
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  async function uploadFile(file: File | Blob) {
    try {
      if (file) {
        const rx = await uploader.upload(file, file.name);
        if (rx.header) {
          const link = `nostr:${new NostrLink(NostrPrefix.Event, rx.header.id, rx.header.kind).encode(
            CONFIG.eventLinkPrefix,
          )}`;
          setMsg(`${msg ? `${msg}\n` : ""}${link}`);
          setOtherEvents([...otherEvents, rx.header]);
        } else if (rx.url) {
          setMsg(`${msg ? `${msg}\n` : ""}${rx.url}`);
        } else if (rx?.error) {
          setError(rx.error);
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

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
      <AsyncIcon className="circle flex items-center button" iconName="attachment" onClick={() => attachFile()} />
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
        {error && <b className="error">{error}</b>}
      </div>
      <AsyncIcon className="circle flex items-center button" iconName="arrow-right" onClick={() => sendMessage()} />
    </>
  );
}
