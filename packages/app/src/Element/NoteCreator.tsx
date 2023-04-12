import "./NoteCreator.css";
import { FormattedMessage, useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { EventKind, TaggedRawEvent } from "@snort/nostr";

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
  setPollOptions,
} from "State/NoteCreator";
import type { RootState } from "State/Store";
import { LNURL } from "LNURL";

import messages from "./messages";
import { ClipboardEventHandler, useState } from "react";
import Spinner from "Icons/Spinner";

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
  const pollOptions = useSelector((s: RootState) => s.noteCreator.pollOptions);
  const [uploadInProgress, setUploadInProgress] = useState(false);
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
      const kind = pollOptions ? EventKind.Polls : EventKind.TextNote;
      if (pollOptions) {
        extraTags ??= [];
        extraTags.push(...pollOptions.map((a, i) => ["poll_option", i.toString(), a]));
      }
      const ev = replyTo
        ? await publisher.reply(replyTo, note, extraTags, kind)
        : await publisher.note(note, extraTags, kind);
      publisher.broadcast(ev);
      dispatch(reset());
    }
  }

  async function attachFile() {
    try {
      const file = await openFile();
      if (file) {
        uploadFile(file);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        dispatch(setError(error?.message));
      }
    }
  }

  async function uploadFile(file: File) {
    setUploadInProgress(true);
    try {
      if (file) {
        const rx = await uploader.upload(file, file.name);
        if (rx.url) {
          dispatch(setNote(`${note ? `${note}\n` : ""}${rx.url}`));
        } else if (rx?.error) {
          dispatch(setError(rx.error));
        }
        setUploadInProgress(false);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        dispatch(setError(error?.message));
      }
      setUploadInProgress(false);
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
      dispatch(setPreview(undefined));
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

  function renderPollOptions() {
    if (pollOptions) {
      return (
        <>
          <h4>
            <FormattedMessage defaultMessage="Poll Options" />
          </h4>
          {pollOptions?.map((a, i) => (
            <div className="form-group w-max" key={`po-${i}`}>
              <div>
                <FormattedMessage defaultMessage="Option: {n}" values={{ n: i + 1 }} />
              </div>
              <div>
                <input type="text" value={a} onChange={e => changePollOption(i, e.target.value)} />
                {i > 1 && (
                  <button onClick={() => removePollOption(i)} className="ml5">
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={() => dispatch(setPollOptions([...pollOptions, ""]))}>
            <Icon name="plus" size={14} />
          </button>
        </>
      );
    }
  }

  function changePollOption(i: number, v: string) {
    if (pollOptions) {
      const copy = [...pollOptions];
      copy[i] = v;
      dispatch(setPollOptions(copy));
    }
  }

  function removePollOption(i: number) {
    if (pollOptions) {
      const copy = [...pollOptions];
      copy.splice(i, 1);
      dispatch(setPollOptions(copy));
    }
  }

  const handlePaste: ClipboardEventHandler<HTMLDivElement> = evt => {
    if (evt.clipboardData) {
      const clipboardItems = evt.clipboardData.items;
      const items: DataTransferItem[] = Array.from(clipboardItems).filter(function (item: DataTransferItem) {
        // Filter the image items only
        return /^image\//.test(item.type);
      });
      if (items.length === 0) {
        return;
      }

      const item = items[0];
      const blob = item.getAsFile();
      if (blob) {
        const file = new File([blob], "filename.jpg", { type: "image/jpeg", lastModified: new Date().getTime() });
        uploadFile(file);
      }
    }
  };

  return (
    <>
      {show && (
        <Modal className="note-creator-modal" onClose={() => dispatch(setShow(false))}>
          {replyTo && <NotePreview note={replyTo} />}
          {preview && getPreviewNote()}
          {!preview && (
            <div
              onPaste={handlePaste}
              className={`flex note-creator${replyTo ? " note-reply" : ""}${pollOptions ? " poll" : ""}`}>
              <div className="flex f-col f-grow">
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
                {renderPollOptions()}
                <div className="insert">
                  {pollOptions === undefined && !replyTo && (
                    <button type="button" onClick={() => dispatch(setPollOptions(["A", "B"]))}>
                      <Icon name="pie-chart" />
                    </button>
                  )}
                  <button type="button" onClick={attachFile}>
                    <Icon name="attachment" />
                  </button>
                </div>
              </div>
              {error && <span className="error">{error}</span>}
            </div>
          )}
          <div className="note-creator-actions">
            {uploadInProgress && <Spinner />}
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
