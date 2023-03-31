import "./NoteCreator.css";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { RawEvent, TaggedRawEvent } from "@snort/nostr";

import Icon from "Icons/Icon";
import useEventPublisher from "Feed/EventPublisher";
import { openFile } from "Util";
import Textarea from "Element/Textarea";
import Modal from "Element/Modal";
import ProfileImage from "Element/ProfileImage";
import useFileUpload from "Upload";
import Note from "Element/Note";

import messages from "./messages";

interface NotePreviewProps {
  note: TaggedRawEvent;
}

function NotePreview({ note }: NotePreviewProps) {
  return (
    <div className="note-preview">
      <ProfileImage pubkey={note.pubkey} />
      <div className="note-preview-body">
        {note.content.slice(0, 136)}
        {note.content.length > 140 && "..."}
      </div>
    </div>
  );
}

export interface NoteCreatorProps {
  show: boolean;
  setShow: (s: boolean) => void;
  replyTo?: TaggedRawEvent;
  onSend?: () => void;
  autoFocus: boolean;
}

export function NoteCreator(props: NoteCreatorProps) {
  const { show, setShow, replyTo, onSend, autoFocus } = props;
  const publisher = useEventPublisher();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<RawEvent>();
  const uploader = useFileUpload();

  async function sendNote() {
    if (note) {
      const ev = replyTo ? await publisher.reply(replyTo, note) : await publisher.note(note);
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
      const file = await openFile();
      if (file) {
        const rx = await uploader.upload(file, file.name);
        if (rx.url) {
          setNote(n => `${n ? `${n}\n` : ""}${rx.url}`);
        } else if (rx?.error) {
          setError(rx.error);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error?.message);
      }
    }
  }

  function onChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    const { value } = ev.target;
    setNote(value);
    if (value) {
      setActive(true);
    } else {
      setActive(false);
    }
  }

  function cancel() {
    setShow(false);
    setNote("");
  }

  function onSubmit(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.stopPropagation();
    sendNote().catch(console.warn);
  }

  async function loadPreview() {
    if (preview) {
      setPreview(undefined);
    } else {
      const tmpNote = await publisher.note(note);
      if (tmpNote) {
        setPreview(tmpNote);
      }
    }
  }

  function getPreviewNote() {
    if (preview) {
      return (
        <Note
          data={preview as TaggedRawEvent}
          related={[]}
          options={{
            showFooter: false,
            canClick: false,
          }}
        />
      );
    }
  }

  return (
    <>
      {show && (
        <Modal className="note-creator-modal" onClose={() => setShow(false)}>
          {replyTo && <NotePreview note={replyTo} />}
          {preview && getPreviewNote()}
          {!preview && (
            <div className={`flex note-creator ${replyTo ? "note-reply" : ""}`}>
              <div className="flex f-col mr10 f-grow">
                <Textarea
                  autoFocus={autoFocus}
                  className={`textarea ${active ? "textarea--focused" : ""}`}
                  onChange={onChange}
                  value={note}
                  onFocus={() => setActive(true)}
                />
                <button type="button" className="attachment" onClick={attachFile}>
                  <Icon name="attachment" />
                </button>
              </div>
              {error && <span className="error">{error}</span>}
            </div>
          )}
          <div className="note-creator-actions">
            <button className="secondary" type="button" onClick={loadPreview}>
              <FormattedMessage defaultMessage="Toggle Preview" />
            </button>
            <button className="secondary" type="button" onClick={cancel}>
              <FormattedMessage {...messages.Cancel} />
            </button>
            <button type="button" onClick={onSubmit}>
              {replyTo ? <FormattedMessage {...messages.Reply} /> : <FormattedMessage {...messages.Send} />}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
