import "./NoteCreator.css";
import { FormattedMessage, useIntl } from "react-intl";
import { EventBuilder, EventKind, NostrLink, NostrPrefix, TaggedNostrEvent, tryParseNostrLink } from "@snort/system";
import classNames from "classnames";
import { TagsInput } from "react-tag-input-component";

import Icon from "@/Icons/Icon";
import useEventPublisher from "@/Hooks/useEventPublisher";
import { appendDedupe, openFile } from "@/SnortUtils";
import Textarea from "@/Element/Textarea";
import Modal from "@/Element/Modal";
import ProfileImage from "@/Element/User/ProfileImage";
import useFileUpload from "@/Upload";
import Note from "@/Element/Event/Note";

import { ClipboardEventHandler, DragEvent, useEffect } from "react";
import useLogin from "@/Hooks/useLogin";
import { GetPowWorker } from "@/index";
import AsyncButton from "@/Element/Button/AsyncButton";
import { AsyncIcon } from "@/Element/Button/AsyncIcon";
import { fetchNip05Pubkey, unixNow } from "@snort/shared";
import { ZapTarget } from "@/Zapper";
import { useNoteCreator } from "@/State/NoteCreator";
import FileUploadProgress from "../FileUpload";
import { ToggleSwitch } from "@/Icons/Toggle";
import { sendEventToRelays } from "@/Element/Event/Create/util";
import { TrendingHashTagsLine } from "@/Element/Event/Create/TrendingHashTagsLine";
import { Toastore } from "@/Toaster";
import { OkResponseRow } from "./OkResponseRow";

export function NoteCreator() {
  const { formatMessage } = useIntl();
  const uploader = useFileUpload();
  const login = useLogin(s => ({ relays: s.relays, publicKey: s.publicKey, pow: s.appData.item.preferences.pow }));
  const { system, publisher: pub } = useEventPublisher();
  const publisher = login.pow ? pub?.pow(login.pow, GetPowWorker()) : pub;
  const note = useNoteCreator();
  const relays = login.relays;

  useEffect(() => {
    const draft = localStorage.getItem("msgDraft");
    if (draft) {
      note.update(n => (n.note = draft));
    }
  }, []);

  async function buildNote() {
    try {
      note.update(v => (v.error = ""));
      if (note && publisher) {
        let extraTags: Array<Array<string>> | undefined;
        if (note.zapSplits) {
          const parsedSplits = [] as Array<ZapTarget>;
          for (const s of note.zapSplits) {
            if (s.value.startsWith(NostrPrefix.PublicKey) || s.value.startsWith(NostrPrefix.Profile)) {
              const link = tryParseNostrLink(s.value);
              if (link) {
                parsedSplits.push({ ...s, value: link.id });
              } else {
                throw new Error(
                  formatMessage(
                    {
                      defaultMessage: "Failed to parse zap split: {input}",
                      id: "sZQzjQ",
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
                      id: "sZQzjQ",
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
                    id: "8Y6bZQ",
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

        if (note.sensitive) {
          extraTags ??= [];
          extraTags.push(["content-warning", note.sensitive]);
        }
        const kind = note.pollOptions ? EventKind.Polls : EventKind.TextNote;
        if (note.pollOptions) {
          extraTags ??= [];
          extraTags.push(...note.pollOptions.map((a, i) => ["poll_option", i.toString(), a]));
        }
        if (note.hashTags.length > 0) {
          extraTags ??= [];
          extraTags.push(...note.hashTags.map(a => ["t", a.toLowerCase()]));
        }
        // add quote repost
        if (note.quote) {
          if (!note.note.endsWith("\n")) {
            note.note += "\n";
          }
          const link = NostrLink.fromEvent(note.quote);
          note.note += `nostr:${link.encode(CONFIG.eventLinkPrefix)}`;
          const quoteTag = link.toEventTag();
          if (quoteTag) {
            extraTags ??= [];
            if (quoteTag[0] === "e") {
              quoteTag[0] = "q"; // how to 'q' tag replacable events?
            }
            extraTags.push(quoteTag);
          }
        }
        const hk = (eb: EventBuilder) => {
          extraTags?.forEach(t => eb.tag(t));
          note.extraTags?.forEach(t => eb.tag(t));
          eb.kind(kind);
          return eb;
        };
        const ev = note.replyTo
          ? await publisher.reply(note.replyTo, note.note, hk)
          : await publisher.note(note.note, hk);
        return ev;
      }
    } catch (e) {
      note.update(v => {
        if (e instanceof Error) {
          v.error = e.message;
        } else {
          v.error = e as string;
        }
      });
    }
  }

  async function sendNote() {
    const ev = await buildNote();
    if (ev) {
      const events = (note.otherEvents ?? []).concat(ev);
      events.map(a =>
        sendEventToRelays(system, a, note.selectedCustomRelays, r => {
          if (CONFIG.noteCreatorToast) {
            r.forEach(rr => {
              Toastore.push({
                element: c => <OkResponseRow rsp={rr} close={c} />,
                expire: unixNow() + (rr.ok ? 5 : 55555),
              });
            });
          }
        }),
      );
      note.update(n => n.reset());
      localStorage.removeItem("msgDraft");
    }
  }

  async function attachFile() {
    try {
      const file = await openFile();
      if (file) {
        uploadFile(file);
      }
    } catch (e) {
      note.update(v => {
        if (e instanceof Error) {
          v.error = e.message;
        } else {
          v.error = e as string;
        }
      });
    }
  }

  async function uploadFile(file: File | Blob) {
    try {
      if (file) {
        const rx = await uploader.upload(file, file.name);
        note.update(v => {
          if (rx.header) {
            const link = `nostr:${new NostrLink(NostrPrefix.Event, rx.header.id, rx.header.kind).encode(
              CONFIG.eventLinkPrefix,
            )}`;
            v.note = `${v.note ? `${v.note}\n` : ""}${link}`;
            v.otherEvents = [...(v.otherEvents ?? []), rx.header];
          } else if (rx.url) {
            v.note = `${v.note ? `${v.note}\n` : ""}${rx.url}`;
            if (rx.metadata) {
              v.extraTags ??= [];
              const imeta = ["imeta", `url ${rx.url}`];
              if (rx.metadata.blurhash) {
                imeta.push(`blurhash ${rx.metadata.blurhash}`);
              }
              if (rx.metadata.width && rx.metadata.height) {
                imeta.push(`dim ${rx.metadata.width}x${rx.metadata.height}`);
              }
              if (rx.metadata.hash) {
                imeta.push(`x ${rx.metadata.hash}`);
              }
              v.extraTags.push(imeta);
            }
          } else if (rx?.error) {
            v.error = rx.error;
          }
        });
      }
    } catch (e) {
      note.update(v => {
        if (e instanceof Error) {
          v.error = e.message;
        } else {
          v.error = e as string;
        }
      });
    }
  }

  function onChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    const { value } = ev.target;
    note.update(n => (n.note = value));
    localStorage.setItem("msgDraft", value);
  }

  function cancel() {
    note.update(v => {
      v.show = false;
      v.reset();
    });
  }

  async function onSubmit(ev: React.MouseEvent) {
    ev.stopPropagation();
    await sendNote();
  }

  async function loadPreview() {
    if (note.preview) {
      note.update(v => (v.preview = undefined));
    } else if (publisher) {
      const tmpNote = await buildNote();
      note.update(v => (v.preview = tmpNote));
    }
  }

  function getPreviewNote() {
    if (note.preview) {
      return (
        <Note
          data={note.preview as TaggedNostrEvent}
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
    if (note.pollOptions) {
      return (
        <>
          <h4>
            <FormattedMessage defaultMessage="Poll Options" id="vhlWFg" />
          </h4>
          {note.pollOptions?.map((a, i) => (
            <div className="form-group w-max" key={`po-${i}`}>
              <div>
                <FormattedMessage defaultMessage="Option: {n}" id="mfe8RW" values={{ n: i + 1 }} />
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
          <button onClick={() => note.update(v => (v.pollOptions = [...(note.pollOptions ?? []), ""]))}>
            <Icon name="plus" size={14} />
          </button>
        </>
      );
    }
  }

  function changePollOption(i: number, v: string) {
    if (note.pollOptions) {
      const copy = [...note.pollOptions];
      copy[i] = v;
      note.update(v => (v.pollOptions = copy));
    }
  }

  function removePollOption(i: number) {
    if (note.pollOptions) {
      const copy = [...note.pollOptions];
      copy.splice(i, 1);
      note.update(v => (v.pollOptions = copy));
    }
  }

  function renderRelayCustomisation() {
    return (
      <div className="flex flex-col g8">
        {Object.keys(relays.item || {})
          .filter(el => relays.item[el].write)
          .map((r, i, a) => (
            <div className="p flex justify-between note-creator-relay">
              <div>{r}</div>
              <div>
                <input
                  type="checkbox"
                  checked={!note.selectedCustomRelays || note.selectedCustomRelays.includes(r)}
                  onChange={e => {
                    note.update(
                      v =>
                      (v.selectedCustomRelays =
                        // set false if all relays selected
                        e.target.checked &&
                          note.selectedCustomRelays &&
                          note.selectedCustomRelays.length == a.length - 1
                          ? undefined
                          : // otherwise return selectedCustomRelays with target relay added / removed
                          a.filter(el =>
                            el === r
                              ? e.target.checked
                              : !note.selectedCustomRelays || note.selectedCustomRelays.includes(el),
                          )),
                    );
                  }}
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

  function noteCreatorAdvanced() {
    return (
      <>
        <div>
          <h4>
            <FormattedMessage defaultMessage="Custom Relays" id="EcZF24" />
          </h4>
          <p>
            <FormattedMessage defaultMessage="Send note to a subset of your write relays" id="th5lxp" />
          </p>
          {renderRelayCustomisation()}
        </div>
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Zap Splits" id="5CB6zB" />
          </h4>
          <FormattedMessage defaultMessage="Zaps on this note will be split to the following users." id="LwYmVi" />
          <div className="flex flex-col g8">
            {[...(note.zapSplits ?? [])].map((v, i, arr) => (
              <div className="flex items-center g8">
                <div className="flex flex-col f-4 g4">
                  <h4>
                    <FormattedMessage defaultMessage="Recipient" id="8Rkoyb" />
                  </h4>
                  <input
                    type="text"
                    value={v.value}
                    onChange={e =>
                      note.update(
                        v => (v.zapSplits = arr.map((vv, ii) => (ii === i ? { ...vv, value: e.target.value } : vv))),
                      )
                    }
                    placeholder={formatMessage({ defaultMessage: "npub / nprofile / nostr address", id: "WvGmZT" })}
                  />
                </div>
                <div className="flex flex-col f-1 g4">
                  <h4>
                    <FormattedMessage defaultMessage="Weight" id="zCb8fX" />
                  </h4>
                  <input
                    type="number"
                    min={0}
                    value={v.weight}
                    onChange={e =>
                      note.update(
                        v =>
                        (v.zapSplits = arr.map((vv, ii) =>
                          ii === i ? { ...vv, weight: Number(e.target.value) } : vv,
                        )),
                      )
                    }
                  />
                </div>
                <div className="flex flex-col s g4">
                  <div>&nbsp;</div>
                  <Icon
                    name="close"
                    onClick={() => note.update(v => (v.zapSplits = (v.zapSplits ?? []).filter((_v, ii) => ii !== i)))}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                note.update(v => (v.zapSplits = [...(v.zapSplits ?? []), { type: "pubkey", value: "", weight: 1 }]))
              }>
              <FormattedMessage defaultMessage="Add" id="2/2yg+" />
            </button>
          </div>
          <span className="warning">
            <FormattedMessage
              defaultMessage="Not all clients support this, you may still receive some zaps as if zap splits was not configured"
              id="6bgpn+"
            />
          </span>
        </div>
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Sensitive Content" id="bQdA2k" />
          </h4>
          <FormattedMessage
            defaultMessage="Users must accept the content warning to show the content of your note."
            id="UUPFlt"
          />
          <input
            className="w-max"
            type="text"
            value={note.sensitive}
            onChange={e => note.update(v => (v.sensitive = e.target.value))}
            maxLength={50}
            minLength={1}
            placeholder={formatMessage({
              defaultMessage: "Reason",
              id: "AkCxS/",
            })}
          />
          <span className="warning">
            <FormattedMessage defaultMessage="Not all clients support this yet" id="gXgY3+" />
          </span>
        </div>
      </>
    );
  }

  function noteCreatorFooter() {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center g8">
          <ProfileImage
            pubkey={login.publicKey ?? ""}
            className="note-creator-icon"
            link=""
            showUsername={false}
            showFollowDistance={false}
          />
          {note.pollOptions === undefined && !note.replyTo && (
            <AsyncIcon
              iconName="list"
              iconSize={24}
              onClick={() => note.update(v => (v.pollOptions = ["A", "B"]))}
              className={classNames("note-creator-icon", { active: note.pollOptions !== undefined })}
            />
          )}
          <AsyncIcon iconName="image-plus" iconSize={24} onClick={attachFile} className="note-creator-icon" />
          <AsyncIcon
            iconName="settings-04"
            iconSize={24}
            onClick={() => note.update(v => (v.advanced = !v.advanced))}
            className={classNames("note-creator-icon", { active: note.advanced })}
          />
          <span className="sm:inline hidden">
            <FormattedMessage defaultMessage="Preview" id="TJo5E6" />
          </span>
          <ToggleSwitch
            onClick={() => loadPreview()}
            size={40}
            className={classNames({ active: Boolean(note.preview) })}
          />
        </div>
        <div className="flex g8">
          <button className="secondary" onClick={cancel}>
            <FormattedMessage defaultMessage="Cancel" id="47FYwb" />
          </button>
          <AsyncButton onClick={onSubmit} className="primary">
            {note.replyTo ? (
              <FormattedMessage defaultMessage="Reply" id="9HU8vw" />
            ) : (
              <FormattedMessage defaultMessage="Send" id="9WRlF4" />
            )}
          </AsyncButton>
        </div>
      </div>
    );
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

  const handleDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
  };

  const handleDragLeave = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();

    const droppedFiles = Array.from(event.dataTransfer.files);

    droppedFiles.forEach(async file => {
      await uploadFile(file);
    });
  };

  function noteCreatorForm() {
    return (
      <>
        {note.replyTo && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Reply To" id="8ED/4u" />
            </h4>
            <Note
              data={note.replyTo}
              related={[]}
              options={{
                showFooter: false,
                showContextMenu: false,
                showTime: false,
                canClick: false,
                showMedia: false,
                longFormPreview: true,
              }}
            />
          </>
        )}
        {note.quote && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Quote Repost" id="C7642/" />
            </h4>
            <Note
              data={note.quote}
              related={[]}
              options={{
                showFooter: false,
                showContextMenu: false,
                showTime: false,
                canClick: false,
                showMedia: false,
                longFormPreview: true,
              }}
            />
          </>
        )}
        {note.preview && getPreviewNote()}
        {!note.preview && (
          <>
            <div onPaste={handlePaste} className={classNames("note-creator", { poll: Boolean(note.pollOptions) })}>
              <Textarea
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                autoFocus
                className={classNames("textarea", { "textarea--focused": note.active })}
                onChange={c => onChange(c)}
                value={note.note}
                onFocus={() => note.update(v => (v.active = true))}
                onKeyDown={e => {
                  if (e.key === "Enter" && e.metaKey) {
                    sendNote().catch(console.warn);
                  }
                }}
              />
              {renderPollOptions()}
            </div>
            <div className="flex flex-col g4">
              <TagsInput
                value={note.hashTags}
                onChange={e => note.update(s => (s.hashTags = e))}
                placeHolder={formatMessage({
                  defaultMessage: "Add up to 4 hashtags",
                  id: "AIgmDy",
                })}
                separators={["Enter", ","]}
              />
              {note.hashTags.length > 4 && (
                <small className="warning">
                  <FormattedMessage defaultMessage="Try to use less than 5 hashtags to stay on topic 🙏" id="d8gpCh" />
                </small>
              )}
              <TrendingHashTagsLine onClick={t => note.update(s => (s.hashTags = appendDedupe(s.hashTags, [t])))} />
            </div>
          </>
        )}
        {uploader.progress.length > 0 && <FileUploadProgress progress={uploader.progress} />}
        {noteCreatorFooter()}
        {note.error && <span className="error">{note.error}</span>}
        {note.advanced && noteCreatorAdvanced()}
      </>
    );
  }

  function reset() {
    note.update(v => {
      v.show = false;
    });
  }

  if (!note.show) return null;
  return (
    <Modal id="note-creator" className="note-creator-modal" onClose={reset}>
      {noteCreatorForm()}
    </Modal>
  );
}
