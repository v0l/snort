import "./NoteCreator.css";
import { FormattedMessage, useIntl } from "react-intl";
import { EventKind, NostrPrefix, TaggedNostrEvent, EventBuilder, tryParseNostrLink, NostrLink } from "@snort/system";

import Icon from "Icons/Icon";
import useEventPublisher from "Hooks/useEventPublisher";
import { openFile } from "SnortUtils";
import Textarea from "Element/Textarea";
import Modal from "Element/Modal";
import ProfileImage from "Element/User/ProfileImage";
import useFileUpload from "Upload";
import Note from "Element/Event/Note";

import { ClipboardEventHandler } from "react";
import useLogin from "Hooks/useLogin";
import { GetPowWorker } from "index";
import AsyncButton from "Element/AsyncButton";
import { AsyncIcon } from "Element/AsyncIcon";
import { fetchNip05Pubkey } from "@snort/shared";
import { ZapTarget } from "Zapper";
import { useNoteCreator } from "State/NoteCreator";
import { NoteBroadcaster } from "./NoteBroadcaster";
import FileUploadProgress from "./FileUpload";

export function NoteCreator() {
  const { formatMessage } = useIntl();
  const uploader = useFileUpload();
  const login = useLogin(s => ({ relays: s.relays, publicKey: s.publicKey, pow: s.preferences.pow }));
  const { publisher: pub } = useEventPublisher();
  const publisher = login.pow ? pub?.pow(login.pow, GetPowWorker()) : pub;
  const note = useNoteCreator();
  const relays = login.relays;

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

        if (note.sensitive) {
          extraTags ??= [];
          extraTags.push(["content-warning", note.sensitive]);
        }
        const kind = note.pollOptions ? EventKind.Polls : EventKind.TextNote;
        if (note.pollOptions) {
          extraTags ??= [];
          extraTags.push(...note.pollOptions.map((a, i) => ["poll_option", i.toString(), a]));
        }
        // add quote repost
        if (note.quote) {
          if (!note.note.endsWith("\n")) {
            note.note += "\n";
          }
          const link = NostrLink.fromEvent(note.quote);
          note.note += `nostr:${link.encode()}`;
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
      note.update(n => {
        n.sending = (note.otherEvents ?? []).concat(ev);
      });
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
            const link = `nostr:${new NostrLink(NostrPrefix.Event, rx.header.id, rx.header.kind).encode()}`;
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
            <FormattedMessage defaultMessage="Poll Options" />
          </h4>
          {note.pollOptions?.map((a, i) => (
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
      <div className="flex-column g8">
        {Object.keys(relays.item || {})
          .filter(el => relays.item[el].write)
          .map((r, i, a) => (
            <div className="p flex f-space note-creator-relay">
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
            {[...(note.zapSplits ?? [])].map((v, i, arr) => (
              <div className="flex f-center g8">
                <div className="flex-column f-4 g4">
                  <h4>
                    <FormattedMessage defaultMessage="Recipient" />
                  </h4>
                  <input
                    type="text"
                    value={v.value}
                    onChange={e =>
                      note.update(
                        v => (v.zapSplits = arr.map((vv, ii) => (ii === i ? { ...vv, value: e.target.value } : vv))),
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
                      note.update(
                        v =>
                          (v.zapSplits = arr.map((vv, ii) =>
                            ii === i ? { ...vv, weight: Number(e.target.value) } : vv,
                          )),
                      )
                    }
                  />
                </div>
                <div className="flex-column f-shrink g4">
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
            value={note.sensitive}
            onChange={e => note.update(v => (v.sensitive = e.target.value))}
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
    );
  }

  function noteCreatorFooter() {
    return (
      <div className="flex f-space">
        <div className="flex g8">
          <ProfileImage
            pubkey={login.publicKey ?? ""}
            className="note-creator-icon"
            link=""
            showUsername={false}
            showFollowingMark={false}
          />
          {note.pollOptions === undefined && !note.replyTo && (
            <AsyncIcon
              iconName="pie-chart"
              iconSize={24}
              onClick={() => note.update(v => (v.pollOptions = ["A", "B"]))}
              className="note-creator-icon"
            />
          )}
          <AsyncIcon iconName="image-plus" iconSize={24} onClick={attachFile} className="note-creator-icon" />
          <AsyncIcon
            iconName="settings-04"
            iconSize={24}
            onClick={() => note.update(v => (v.advanced = !v.advanced))}
            className="note-creator-icon"
          />
        </div>
        <div className="flex g8">
          <button className="secondary" onClick={cancel}>
            <FormattedMessage defaultMessage="Cancel" />
          </button>
          <AsyncButton onClick={onSubmit}>
            {note.replyTo ? <FormattedMessage defaultMessage="Reply" /> : <FormattedMessage defaultMessage="Send" />}
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

  function noteCreatorForm() {
    return (
      <>
        {note.replyTo && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Reply To" />
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
              <FormattedMessage defaultMessage="Quote Repost" />
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
          <div onPaste={handlePaste} className={`note-creator${note.pollOptions ? " poll" : ""}`}>
            <Textarea
              autoFocus
              className={`textarea ${note.active ? "textarea--focused" : ""}`}
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
        )}
        {uploader.progress.length > 0 && <FileUploadProgress progress={uploader.progress} />}
        {noteCreatorFooter()}
        {note.error && <span className="error">{note.error}</span>}
        {note.advanced && noteCreatorAdvanced()}
      </>
    );
  }

  if (!note.show) return null;
  return (
    <Modal id="note-creator" className="note-creator-modal" onClose={() => note.update(v => (v.show = false))}>
      {note.sending && (
        <NoteBroadcaster
          evs={note.sending}
          onClose={() => {
            note.update(n => {
              n.reset();
              n.show = false;
            });
          }}
          customRelays={note.selectedCustomRelays}
        />
      )}
      {!note.sending && noteCreatorForm()}
    </Modal>
  );
}
