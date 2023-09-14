import "./NoteCreator.css";
import { FormattedMessage, useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { encodeTLV, EventKind, NostrPrefix, TaggedNostrEvent, EventBuilder, tryParseNostrLink } from "@snort/system";

import Icon from "Icons/Icon";
import useEventPublisher from "Feed/EventPublisher";
import { openFile } from "SnortUtils";
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
  setZapSplits,
  setSensitive,
  reset,
  setPollOptions,
  setOtherEvents,
} from "State/NoteCreator";
import type { RootState } from "State/Store";

import { ClipboardEventHandler } from "react";
import useLogin from "Hooks/useLogin";
import { System } from "index";
import AsyncButton from "Element/AsyncButton";
import { AsyncIcon } from "Element/AsyncIcon";
import { fetchNip05Pubkey } from "@snort/shared";
import { ZapTarget } from "Zapper";

export function NoteCreator() {
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const uploader = useFileUpload();
  const {
    note,
    zapSplits,
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
  const dispatch = useDispatch();
  const login = useLogin();
  const relays = login.relays;

  async function buildNote() {
    try {
      dispatch(setError(""));
      if (note && publisher) {
        let extraTags: Array<Array<string>> | undefined;
        if (zapSplits) {
          const parsedSplits = [] as Array<ZapTarget>;
          for (const s of zapSplits) {
            if (s.value.startsWith(NostrPrefix.PublicKey) || s.value.startsWith(NostrPrefix.Profile)) {
              const link = tryParseNostrLink(s.value);
              if (link) {
                parsedSplits.push({ ...s, value: link.id });
              } else {
                throw new Error(
                  formatMessage(
                    {
                      defaultMessage: "Failed to parse zap split: {input}",
                    },
                    {
                      input: s.value,
                    },
                  ),
                );
              }
            } else if (s.value.includes("@")) {
              const [name, domain] = s.value.split("@");
              const pubkey = await fetchNip05Pubkey(name, domain);
              if (pubkey) {
                parsedSplits.push({ ...s, value: pubkey });
              } else {
                throw new Error(
                  formatMessage(
                    {
                      defaultMessage: "Failed to parse zap split: {input}",
                    },
                    {
                      input: s.value,
                    },
                  ),
                );
              }
            } else {
              throw new Error(
                formatMessage(
                  {
                    defaultMessage: "Invalid zap split: {input}",
                  },
                  {
                    input: s.value,
                  },
                ),
              );
            }
          }
          extraTags = parsedSplits.map(v => ["zap", v.value, "", String(v.weight)]);
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
        return ev;
      }
    } catch (e) {
      if (e instanceof Error) {
        dispatch(setError(e.message));
      } else {
        dispatch(setError(e as string));
      }
    }
  }

  async function sendNote() {
    const ev = await buildNote();
    if (ev) {
      if (selectedCustomRelays) selectedCustomRelays.forEach(r => System.WriteOnceToRelay(r, ev));
      else System.BroadcastEvent(ev);
      dispatch(reset());
      for (const oe of otherEvents) {
        if (selectedCustomRelays) selectedCustomRelays.forEach(r => System.WriteOnceToRelay(r, oe));
        else System.BroadcastEvent(oe);
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

  async function onSubmit(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.stopPropagation();
    await sendNote();
  }

  async function loadPreview() {
    if (preview) {
      dispatch(setPreview(undefined));
    } else if (publisher) {
      const tmpNote = await buildNote();
      if (tmpNote) {
        dispatch(setPreview(tmpNote));
      }
    }
  }

  function getPreviewNote() {
    if (preview) {
      return (
        <Note
          data={preview as TaggedNostrEvent}
          related={[]}
          options={{
            showContextMenu: false,
            showFooter: false,
            canClick: false,
            showTime: false,
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
      <div className="flex-column g8">
        {Object.keys(relays.item || {})
          .filter(el => relays.item[el].write)
          .map((r, i, a) => (
            <div className="p flex f-space note-creator-relay">
              <div>{r}</div>
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
                              el === r ? e.target.checked : !selectedCustomRelays || selectedCustomRelays.includes(el),
                            ),
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
      </div>
    );
  }

  /*function listAccounts() {
    return LoginStore.getSessions().map(a => (
      <MenuItem
        onClick={ev => {
          ev.stopPropagation = true;
          LoginStore.switchAccount(a);
        }}>
        <ProfileImage pubkey={a} link={""} />
      </MenuItem>
    ));
  }*/

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
          {replyTo && (
            <Note
              data={replyTo}
              related={[]}
              options={{
                showFooter: false,
                showContextMenu: false,
                showTime: false,
                canClick: false,
                showMedia: false,
              }}
            />
          )}
          {preview && getPreviewNote()}
          {!preview && (
            <div onPaste={handlePaste} className={`note-creator${pollOptions ? " poll" : ""}`}>
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
            </div>
          )}
          <div className="flex f-space">
            <div className="flex g8">
              <ProfileImage pubkey={login.publicKey ?? ""} className="note-creator-icon" link="" showUsername={false} />
              {pollOptions === undefined && !replyTo && (
                <div className="note-creator-icon">
                  <Icon name="pie-chart" onClick={() => dispatch(setPollOptions(["A", "B"]))} size={24} />
                </div>
              )}
              <AsyncIcon iconName="image-plus" iconSize={24} onClick={attachFile} className="note-creator-icon" />
              <button className="secondary" onClick={() => dispatch(setShowAdvanced(!showAdvanced))}>
                <FormattedMessage defaultMessage="Advanced" />
              </button>
            </div>
            <div className="flex g8">
              <button className="secondary" onClick={cancel}>
                <FormattedMessage defaultMessage="Cancel" />
              </button>
              <AsyncButton onClick={onSubmit}>
                {replyTo ? <FormattedMessage defaultMessage="Reply" /> : <FormattedMessage defaultMessage="Send" />}
              </AsyncButton>
            </div>
          </div>
          {error && <span className="error">{error}</span>}
          {showAdvanced && (
            <>
              <button className="secondary" onClick={loadPreview}>
                <FormattedMessage defaultMessage="Toggle Preview" />
              </button>
              <div>
                <h4>
                  <FormattedMessage defaultMessage="Custom Relays" />
                </h4>
                <p>
                  <FormattedMessage defaultMessage="Send note to a subset of your write relays" />
                </p>
                {renderRelayCustomisation()}
              </div>
              <div className="flex-column g8">
                <h4>
                  <FormattedMessage defaultMessage="Zap Splits" />
                </h4>
                <FormattedMessage defaultMessage="Zaps on this note will be split to the following users." />
                <div className="flex-column g8">
                  {[...(zapSplits ?? [])].map((v, i, arr) => (
                    <div className="flex f-center g8">
                      <div className="flex-column f-4 g4">
                        <h4>
                          <FormattedMessage defaultMessage="Recipient" />
                        </h4>
                        <input
                          type="text"
                          value={v.value}
                          onChange={e =>
                            dispatch(
                              setZapSplits(arr.map((vv, ii) => (ii === i ? { ...vv, value: e.target.value } : vv))),
                            )
                          }
                          placeholder={formatMessage({ defaultMessage: "npub / nprofile / nostr address" })}
                        />
                      </div>
                      <div className="flex-column f-1 g4">
                        <h4>
                          <FormattedMessage defaultMessage="Weight" />
                        </h4>
                        <input
                          type="number"
                          min={0}
                          value={v.weight}
                          onChange={e =>
                            dispatch(
                              setZapSplits(
                                arr.map((vv, ii) => (ii === i ? { ...vv, weight: Number(e.target.value) } : vv)),
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="flex-column f-shrink g4">
                        <div>&nbsp;</div>
                        <Icon
                          name="close"
                          onClick={() => dispatch(setZapSplits((zapSplits ?? []).filter((_v, ii) => ii !== i)))}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(setZapSplits([...(zapSplits ?? []), { type: "pubkey", value: "", weight: 1 }]))
                    }>
                    <FormattedMessage defaultMessage="Add" />
                  </button>
                </div>
                <span className="warning">
                  <FormattedMessage defaultMessage="Not all clients support this, you may still receive some zaps as if zap splits was not configured" />
                </span>
              </div>
              <div className="flex-column g8">
                <h4>
                  <FormattedMessage defaultMessage="Sensitive Content" />
                </h4>
                <FormattedMessage defaultMessage="Users must accept the content warning to show the content of your note." />
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
                <span className="warning">
                  <FormattedMessage defaultMessage="Not all clients support this yet" />
                </span>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
