import "./NoteCreator.css";
import { FormattedMessage, useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { TaggedRawEvent } from "@snort/nostr";

import Icon from "Icons/Icon";
import useEventPublisher from "Feed/EventPublisher";
import { openFile } from "Util";
import Textarea from "Element/Textarea";
import Modal from "Element/Modal";
import ProfileImage from "Element/ProfileImage";
import useFileUpload from "Upload";
import Note from "Element/Note";
import {
  setShow,
  setNote,
  setError,
  setActive,
  setPreview,
  setShowAdvanced,
  setZapForward,
  setSensitive,
  reset,
} from "State/NoteCreator";
import type { RootState } from "State/Store";
import { LNURL } from "LNURL";

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

export function NoteCreator() {
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const uploader = useFileUpload();
  const note = useSelector((s: RootState) => s.noteCreator.note);
  const show = useSelector((s: RootState) => s.noteCreator.show);
  const error = useSelector((s: RootState) => s.noteCreator.error);
  const active = useSelector((s: RootState) => s.noteCreator.active);
  const preview = useSelector((s: RootState) => s.noteCreator.preview);
  const replyTo = useSelector((s: RootState) => s.noteCreator.replyTo);
  const showAdvanced = useSelector((s: RootState) => s.noteCreator.showAdvanced);
  const zapForward = useSelector((s: RootState) => s.noteCreator.zapForward);
  const sensitive = useSelector((s: RootState) => s.noteCreator.sensitive);
  const dispatch = useDispatch();

  async function sendNote() {
    if (note) {
      let extraTags: Array<Array<string>> | undefined;
      if (zapForward) {
        try {
          const svc = new LNURL(zapForward);
          await svc.load();
          extraTags = [svc.getZapTag()];
        } catch {
          dispatch(
            setError(
              formatMessage({
                defaultMessage: "Invalid LNURL",
              })
            )
          );
          return;
        }
      }
      if (sensitive) {
        extraTags ??= [];
        extraTags.push(["content-warning", sensitive]);
      }
      const ev = replyTo ? await publisher.reply(replyTo, note, extraTags) : await publisher.note(note, extraTags);
      console.debug("Sending note: ", ev);
      publisher.broadcast(ev);
      dispatch(reset());
    }
  }

  async function attachFile() {
    try {
      const file = await openFile();
      if (file) {
        const rx = await uploader.upload(file, file.name);
        if (rx.url) {
          dispatch(setNote(`${note ? `${note}\n` : ""}${rx.url}`));
        } else if (rx?.error) {
          dispatch(setError(rx.error));
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        dispatch(setError(error?.message));
      }
    }
  }

  function onChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    const { value } = ev.target;
    dispatch(setNote(value));
    if (value) {
      dispatch(setActive(true));
    } else {
      dispatch(setActive(false));
    }
  }

  function cancel() {
    dispatch(reset());
  }

  function onSubmit(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.stopPropagation();
    sendNote().catch(console.warn);
  }

  async function loadPreview() {
    if (preview) {
      dispatch(setPreview(null));
    } else {
      const tmpNote = await publisher.note(note);
      if (tmpNote) {
        dispatch(setPreview(tmpNote));
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
        <Modal className="note-creator-modal" onClose={() => dispatch(setShow(false))}>
          {replyTo && <NotePreview note={replyTo} />}
          {preview && getPreviewNote()}
          {!preview && (
            <div className={`flex note-creator ${replyTo ? "note-reply" : ""}`}>
              <div className="flex f-col mr10 f-grow">
                <Textarea
                  autoFocus
                  className={`textarea ${active ? "textarea--focused" : ""}`}
                  onChange={onChange}
                  value={note}
                  onFocus={() => dispatch(setActive(true))}
                  onKeyDown={e => {
                    if (e.key === "Enter" && e.metaKey) {
                      sendNote().catch(console.warn);
                    }
                  }}
                />
                <button type="button" className="attachment" onClick={attachFile}>
                  <Icon name="attachment" />
                </button>
              </div>
              {error && <span className="error">{error}</span>}
            </div>
          )}
          <div className="note-creator-actions">
            <button className="secondary" type="button" onClick={() => dispatch(setShowAdvanced(!showAdvanced))}>
              <FormattedMessage defaultMessage="Advanced" />
            </button>
            <button className="secondary" type="button" onClick={cancel}>
              <FormattedMessage {...messages.Cancel} />
            </button>
            <button type="button" onClick={onSubmit}>
              {replyTo ? <FormattedMessage {...messages.Reply} /> : <FormattedMessage {...messages.Send} />}
            </button>
          </div>
          {showAdvanced && (
            <div>
              <button className="secondary" type="button" onClick={loadPreview}>
                <FormattedMessage defaultMessage="Toggle Preview" />
              </button>
              <h4>
                <FormattedMessage defaultMessage="Forward Zaps" />
              </h4>
              <p>
                <FormattedMessage defaultMessage="All zaps sent to this note will be received by the following LNURL" />
              </p>
              <b className="warning">
                <FormattedMessage defaultMessage="Not all clients support this yet" />
              </b>
              <input
                type="text"
                className="w-max"
                placeholder={formatMessage({
                  defaultMessage: "LNURL to forward zaps to",
                })}
                value={zapForward}
                onChange={e => dispatch(setZapForward(e.target.value))}
              />
              <h4>
                <FormattedMessage defaultMessage="Sensitive Content" />
              </h4>
              <p>
                <FormattedMessage defaultMessage="Users must accept the content warning to show the content of your note." />
              </p>
              <b className="warning">
                <FormattedMessage defaultMessage="Not all clients support this yet" />
              </b>
              <div className="flex">
                <input
                  className="w-max"
                  type="text"
                  value={sensitive}
                  onChange={e => dispatch(setSensitive(e.target.value))}
                  maxLength={50}
                  minLength={1}
                  placeholder={formatMessage({
                    defaultMessage: "Reason",
                  })}
                />
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
