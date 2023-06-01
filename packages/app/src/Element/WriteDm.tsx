import { encodeTLV, NostrPrefix, NostrEvent } from "System";
import useEventPublisher from "Feed/EventPublisher";
import Icon from "Icons/Icon";
import Spinner from "Icons/Spinner";
import { useState } from "react";
import useFileUpload from "Upload";
import { openFile } from "SnortUtils";
import Textarea from "./Textarea";

export default function WriteDm({ chatPubKey }: { chatPubKey: string }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherEvents, setOtherEvents] = useState<Array<NostrEvent>>([]);
  const [error, setError] = useState("");
  const publisher = useEventPublisher();
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
    setUploading(true);
    try {
      if (file) {
        const rx = await uploader.upload(file, file.name);
        if (rx.header) {
          const link = `nostr:${encodeTLV(NostrPrefix.Event, rx.header.id, undefined, rx.header.kind)}`;
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
    } finally {
      setUploading(false);
    }
  }

  async function sendDm() {
    if (msg && publisher) {
      setSending(true);
      const ev = await publisher.sendDm(msg, chatPubKey);
      publisher.broadcast(ev);
      setMsg("");
      setSending(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!sending) {
      setMsg(e.target.value);
    }
  }

  async function onEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isEnter = e.code === "Enter";
    if (isEnter && !e.shiftKey) {
      await sendDm();
    }
  }

  return (
    <>
      <button className="btn-rnd" onClick={() => attachFile()}>
        {uploading ? <Spinner width={20} /> : <Icon name="attachment" size={20} />}
      </button>
      <div className="w-max">
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
      <button className="btn-rnd" onClick={() => sendDm()}>
        {sending ? <Spinner width={20} /> : <Icon name="arrow-right" size={20} />}
      </button>
    </>
  );
}
