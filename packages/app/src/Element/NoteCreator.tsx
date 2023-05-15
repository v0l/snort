import "./NoteCreator.css";
import { FormattedMessage, useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { encodeTLV, EventKind, NostrPrefix, TaggedRawEvent } from "@snort/nostr";

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
  setSelectedCustomRelays,
  setZapForward,
  setSensitive,
  reset,
  setPollOptions,
  setOtherEvents,
} from "State/NoteCreator";
import type { RootState } from "State/Store";
import { LNURL } from "LNURL";

import messages from "./messages";
import { ClipboardEventHandler, useState } from "react";
import Spinner from "Icons/Spinner";
import { EventBuilder } from "System";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { LoginStore } from "Login";
import { getCurrentSubscription } from "Subscription";
import useLogin from "Hooks/useLogin";

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
  const {
    note,
    zapForward,
    sensitive,
    pollOptions,
    replyTo,
    otherEvents,
    preview,
    active,
    show,
    showAdvanced,
    selectedCustomRelays,
    error,
  } = useSelector((s: RootState) => s.noteCreator);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const dispatch = useDispatch();
  const sub = getCurrentSubscription(LoginStore.allSubscriptions());
  const login = useLogin();
  const relays = login.relays;

  async function sendNote() {
    if (note && publisher) {
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
      const hk = (eb: EventBuilder) => {
        extraTags?.forEach(t => eb.tag(t));
        eb.kind(kind);
        return eb;
      };
      const ev = replyTo ? await publisher.reply(replyTo, note, hk) : await publisher.note(note, hk);
      if (selectedCustomRelays) publisher.broadcastAll(ev, selectedCustomRelays);
      else publisher.broadcast(ev);
      dispatch(reset());
      for (const oe of otherEvents) {
        if (selectedCustomRelays) publisher.broadcastAll(oe, selectedCustomRelays);
        else publisher.broadcast(oe);
      }
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

  async function uploadFile(file: File | Blob) {
    setUploadInProgress(true);
    try {
      if (file) {
        const rx = await uploader.upload(file, file.name);
        if (rx.header) {
          const link = `nostr:${encodeTLV(NostrPrefix.Event, rx.header.id, undefined, rx.header.kind)}`;
          dispatch(setNote(`${note ? `${note}\n` : ""}${link}`));
          dispatch(setOtherEvents([...otherEvents, rx.header]));
        } else if (rx.url) {
          dispatch(setNote(`${note ? `${note}\n` : ""}${rx.url}`));
        } else if (rx?.error) {
          dispatch(setError(rx.error));
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        dispatch(setError(error?.message));
      }
    } finally {
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
    } else if (publisher) {
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

  function renderRelayCustomisation() {
    return (
      <div>
        {Object.keys(relays.item || {})
          .filter(el => relays.item[el].write)
          .map((r, i, a) => (
            <div className="card flex">
              <div className="flex f-col f-grow">
                <div>{r}</div>
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={!selectedCustomRelays || selectedCustomRelays.includes(r)}
                  onChange={e =>
                    dispatch(
                      setSelectedCustomRelays(
                        // set false if all relays selected
                        e.target.checked && selectedCustomRelays && selectedCustomRelays.length == a.length - 1
                          ? false
                          : // otherwise return selectedCustomRelays with target relay added / removed
                            a.filter(el =>
                              el === r ? e.target.checked : !selectedCustomRelays || selectedCustomRelays.includes(el)
                            )
                      )
                    )
                  }
                />
              </div>
            </div>
          ))}
      </div>
    );
  }

  function listAccounts() {
    return LoginStore.getSessions().map(a => (
      <MenuItem
        onClick={ev => {
          ev.stopPropagation = true;
          LoginStore.switchAccount(a);
        }}>
        <ProfileImage pubkey={a} link={""} />
      </MenuItem>
    ));
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
        uploadFile(blob);
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
                  {sub && (
                    <Menu
                      menuButton={
                        <button>
                          <Icon name="code-circle" />
                        </button>
                      }
                      menuClassName="ctx-menu">
                      {listAccounts()}
                    </Menu>
                  )}
                  {pollOptions === undefined && !replyTo && (
                    <button onClick={() => dispatch(setPollOptions(["A", "B"]))}>
                      <Icon name="pie-chart" />
                    </button>
                  )}
                  <button onClick={attachFile}>
                    <Icon name="attachment" />
                  </button>
                </div>
              </div>
              {error && <span className="error">{error}</span>}
            </div>
          )}
          <div className="note-creator-actions">
            {uploadInProgress && <Spinner />}
            <button className="secondary" onClick={() => dispatch(setShowAdvanced(!showAdvanced))}>
              <FormattedMessage defaultMessage="Advanced" />
            </button>
            <button className="secondary" onClick={cancel}>
              <FormattedMessage {...messages.Cancel} />
            </button>
            <button onClick={onSubmit}>
              {replyTo ? <FormattedMessage {...messages.Reply} /> : <FormattedMessage {...messages.Send} />}
            </button>
          </div>
          {showAdvanced && (
            <div>
              <button className="secondary" onClick={loadPreview}>
                <FormattedMessage defaultMessage="Toggle Preview" />
              </button>
              <h4>
                <FormattedMessage defaultMessage="Custom Relays" />
              </h4>
              <p>
                <FormattedMessage defaultMessage="Send note to a subset of your write relays" />
              </p>
              {renderRelayCustomisation()}
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
