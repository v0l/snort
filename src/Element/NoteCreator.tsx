import "./NoteCreator.css";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import Attachment from "Icons/Attachment";
import useEventPublisher from "Feed/EventPublisher";
import { openFile } from "Util";
import Textarea from "Element/Textarea";
import Modal from "Element/Modal";
import ProfileImage from "Element/ProfileImage";
import { default as NEvent } from "Nostr/Event";
import useFileUpload from "Upload";

import messages from "./messages";

interface NotePreviewProps {
  note: NEvent;
}

function NotePreview({ note }: NotePreviewProps) {
  return (
    <div className="note-preview">
      <ProfileImage pubkey={note.PubKey} />
      <div className="note-preview-body">
        {note.Content.slice(0, 136)}
        {note.Content.length > 140 && "..."}
      </div>
    </div>
  );
}

export interface NoteCreatorProps {
  show: boolean;
  setShow: (s: boolean) => void;
  replyTo?: NEvent;
  onSend?: Function;
  autoFocus: boolean;
}

export function NoteCreator(props: NoteCreatorProps) {
  const { show, setShow, replyTo, onSend, autoFocus } = props;
  const publisher = useEventPublisher();
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string>();
  const [active, setActive] = useState<boolean>(false);
  const uploader = useFileUpload();
  const hasErrors = (error?.length ?? 0) > 0;

  async function sendNote() {
    if (note) {
      let ev = replyTo
        ? await publisher.reply(replyTo, note)
        : await publisher.note(note);
      console.debug("Sending note: ", ev);
      publisher.broadcast(ev);
      setNote("");
      setShow(false);
      if (typeof onSend === "function") {
        onSend();
      }
      setActive(false);
    }
  }

  async function attachFile() {
    try {
      let file = await openFile();
      if (file) {
        let rx = await uploader.upload(file, file.name);
        if (rx.url) {
          setNote((n) => `${n ? `${n}\n` : ""}${rx.url}`);
        } else if (rx?.error) {
          setError(rx.error);
        }
      }
    } catch (error: any) {
      setError(error?.message);
    }
  }

  function onChange(ev: any) {
    const { value } = ev.target;
    setNote(value);
    if (value) {
      setActive(true);
    } else {
      setActive(false);
    }
  }

  function cancel(ev: any) {
    setShow(false);
    setNote("");
  }

  function onSubmit(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.stopPropagation();
    sendNote().catch(console.warn);
  }

  return (
    <>
      {show && (
        <Modal className="note-creator-modal" onClose={() => setShow(false)}>
          {replyTo && <NotePreview note={replyTo} />}
          <div className={`flex note-creator ${replyTo ? "note-reply" : ""}`}>
            <div className="flex f-col mr10 f-grow">
              <Textarea
                autoFocus={autoFocus}
                className={`textarea ${active ? "textarea--focused" : ""}`}
                onChange={onChange}
                value={note}
                onFocus={() => setActive(true)}
              />
              <button
                type="button"
                className="attachment"
                onClick={(e) => attachFile()}
              >
                <Attachment />
              </button>
            </div>
            {hasErrors && <span className="error">{error}</span>}
          </div>
          <div className="note-creator-actions">
            <button className="secondary" type="button" onClick={cancel}>
              <FormattedMessage {...messages.Cancel} />
            </button>
            <button type="button" onClick={onSubmit}>
              {replyTo ? (
                <FormattedMessage {...messages.Reply} />
              ) : (
                <FormattedMessage {...messages.Send} />
              )}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
