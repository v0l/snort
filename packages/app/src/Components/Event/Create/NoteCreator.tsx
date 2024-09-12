/* eslint-disable max-lines */
import { fetchNip05Pubkey, unixNow } from "@snort/shared";
import { EventBuilder, EventKind, NostrLink, NostrPrefix, TaggedNostrEvent, tryParseNostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { Menu, MenuItem } from "@szhsin/react-menu";
import classNames from "classnames";
import { ClipboardEventHandler, DragEvent, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import { AsyncIcon } from "@/Components/Button/AsyncIcon";
import CloseButton from "@/Components/Button/CloseButton";
import IconButton from "@/Components/Button/IconButton";
import { sendEventToRelays } from "@/Components/Event/Create/util";
import Note from "@/Components/Event/EventComponent";
import Flyout from "@/Components/flyout";
import Icon from "@/Components/Icons/Icon";
import { ToggleSwitch } from "@/Components/Icons/Toggle";
import Modal from "@/Components/Modal/Modal";
import Textarea from "@/Components/Textarea/Textarea";
import { Toastore } from "@/Components/Toaster/Toaster";
import { MediaServerFileList } from "@/Components/Upload/file-picker";
import Avatar from "@/Components/User/Avatar";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import useRelays from "@/Hooks/useRelays";
import { useNoteCreator } from "@/State/NoteCreator";
import { openFile, trackEvent } from "@/Utils";
import useFileUpload, { addExtensionToNip94Url, nip94TagsToIMeta, readNip94Tags } from "@/Utils/Upload";
import { GetPowWorker } from "@/Utils/wasm";
import { ZapTarget } from "@/Utils/Zapper";

import FileUploadProgress from "../FileUpload";
import { OkResponseRow } from "./OkResponseRow";

const previewNoteOptions = {
  showContextMenu: false,
  showFooter: false,
  canClick: false,
  showTime: false,
};

const replyToNoteOptions = {
  showFooter: false,
  showContextMenu: false,
  showProfileCard: false,
  showTime: false,
  canClick: false,
  longFormPreview: true,
};

const quoteNoteOptions = {
  showFooter: false,
  showContextMenu: false,
  showTime: false,
  canClick: false,
  longFormPreview: true,
};

export function NoteCreator() {
  const { formatMessage } = useIntl();
  const uploader = useFileUpload();
  const publicKey = useLogin(s => s.publicKey);
  const profile = useUserProfile(publicKey);
  const pow = usePreferences(s => s.pow);
  const relays = useRelays();
  const { system, publisher: pub } = useEventPublisher();
  const publisher = pow ? pub?.pow(pow, GetPowWorker()) : pub;
  const note = useNoteCreator();

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

        for (const ex of note.otherEvents ?? []) {
          const meta = readNip94Tags(ex.tags);
          if (!meta.url) continue;
          if (!note.note.endsWith("\n")) {
            note.note += "\n";
          }
          note.note += addExtensionToNip94Url(meta);
          extraTags ??= [];
          extraTags.push(nip94TagsToIMeta(meta));
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
      let props: Record<string, boolean> | undefined = undefined;
      if (ev.tags.find(a => a[0] === "content-warning")) {
        props ??= {};
        props["content-warning"] = true;
      }
      if (ev.tags.find(a => a[0] === "poll_option")) {
        props ??= {};
        props["poll"] = true;
      }
      if (ev.tags.find(a => a[0] === "zap")) {
        props ??= {};
        props["zap-split"] = true;
      }
      if (note.hashTags.length > 0) {
        props ??= {};
        props["hashtags"] = true;
      }
      if (props) {
        props["content-warning"] ??= false;
        props["poll"] ??= false;
        props["zap-split"] ??= false;
        props["hashtags"] ??= false;
      }
      trackEvent("PostNote", props);

      sendEventToRelays(system, ev, note.selectedCustomRelays, r => {
        if (CONFIG.noteCreatorToast) {
          r.forEach(rr => {
            Toastore.push({
              element: c => <OkResponseRow rsp={rr} close={c} />,
              expire: unixNow() + (rr.ok ? 5 : 55555),
            });
          });
        }
      });
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

  async function uploadFile(file: File) {
    try {
      if (file && uploader) {
        const rx = await uploader.upload(file, file.name);
        note.update(v => {
          if (rx.header) {
            v.otherEvents ??= [];
            v.otherEvents.push(rx.header);
          } else if (rx.url) {
            v.note = `${v.note ? `${v.note}\n` : ""}${rx.url}`;
            if (rx.metadata) {
              v.extraTags ??= [];
              const imeta = nip94TagsToIMeta(rx.metadata);
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
      trackEvent("PostNotePreview");
      note.update(v => (v.preview = tmpNote));
    }
  }

  function getPreviewNote() {
    if (note.preview) {
      return (
        <Note className="hover:bg-transparent" data={note.preview as TaggedNostrEvent} options={previewNoteOptions} />
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
                {i > 1 && <CloseButton className="ml5" onClick={() => removePollOption(i)} />}
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
      <div className="flex flex-col gap-2">
        {Object.entries(relays)
          .filter(el => el[1].write)
          .map(a => a[0])
          .map((r, i, a) => (
            <div className="p flex items-center justify-between bg-gray br" key={r}>
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
            <FormattedMessage defaultMessage="Custom Relays" />
          </h4>
          <p>
            <FormattedMessage defaultMessage="Send note to a subset of your write relays" />
          </p>
          {renderRelayCustomisation()}
        </div>
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Zap Splits" />
          </h4>
          <FormattedMessage defaultMessage="Zaps on this note will be split to the following users." />
          <div className="flex flex-col g8">
            {[...(note.zapSplits ?? [])].map((v: ZapTarget, i, arr) => (
              <div className="flex items-center g8" key={`${v.name}-${v.value}`}>
                <div className="flex flex-col flex-4 g4">
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
                    placeholder={formatMessage({ defaultMessage: "npub / nprofile / nostr address", id: "WvGmZT" })}
                  />
                </div>
                <div className="flex flex-col flex-1 g4">
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
                <div className="flex flex-col g4">
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
        <div className="flex flex-col g8">
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
              id: "AkCxS/",
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
      <div className="flex justify-between">
        <div className="flex items-center gap-4 text-gray-light cursor-pointer">
          <Avatar pubkey={publicKey ?? ""} user={profile} size={28} showTitle={true} />
          <Menu
            menuButton={
              <AsyncIcon iconName="attachment" iconSize={24} className="hover:text-gray-superlight transition" />
            }
            menuClassName="ctx-menu no-icons">
            <div className="close-menu-container">
              {/* This menu item serves as a "close menu" button;
          it allows the user to click anywhere nearby the menu to close it. */}
              <MenuItem>
                <div className="close-menu" />
              </MenuItem>
            </div>
            <MenuItem onClick={() => note.update(s => (s.filePicker = "compact"))}>
              <FormattedMessage defaultMessage="From Server" />
            </MenuItem>
            <MenuItem onClick={() => attachFile()}>
              <FormattedMessage defaultMessage="From File" />
            </MenuItem>
          </Menu>

          {note.pollOptions === undefined && !note.replyTo && (
            <AsyncIcon
              iconName="bar-chart"
              iconSize={24}
              onClick={() => note.update(v => (v.pollOptions = ["A", "B"]))}
              className={classNames("hover:text-gray-superlight transition", {
                "text-white": note.pollOptions !== undefined,
              })}
            />
          )}
          <AsyncIcon
            iconName="settings-outline"
            iconSize={24}
            onClick={() => note.update(v => (v.advanced = !v.advanced))}
            className={classNames("hover:text-gray-superlight transition", { "text-white": note.advanced })}
          />
          <span className="sm:inline hidden">
            <FormattedMessage defaultMessage="Preview" />
          </span>
          <ToggleSwitch
            onClick={() => loadPreview()}
            size={40}
            className={classNames({ active: Boolean(note.preview) })}
          />
        </div>
        <AsyncButton onClick={onSubmit} className="primary">
          {note.replyTo ? <FormattedMessage defaultMessage="Reply" /> : <FormattedMessage defaultMessage="Send" />}
        </AsyncButton>
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
              <FormattedMessage defaultMessage="Reply To" />
            </h4>
            <div className="max-h-64 overflow-y-auto">
              <Note className="hover:bg-transparent" data={note.replyTo} options={replyToNoteOptions} />
            </div>
            <hr className="border-border-color border-1 -mx-6" />
          </>
        )}
        {note.quote && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Quote Repost" />
            </h4>
            <div className="max-h-64 overflow-y-auto">
              <Note className="hover:bg-transparent" data={note.quote} options={quoteNoteOptions} />
            </div>
            <hr className="border-border-color border-1 -mx-6" />
          </>
        )}
        {note.preview && getPreviewNote()}
        {!note.preview && (
          <div className="flex flex-col gap-4">
            <div className="font-medium flex justify-between items-center">
              <FormattedMessage defaultMessage="Compose a note" />
              <AsyncIcon
                iconName="x"
                className="bg-gray rounded-full items-center justify-center flex p-1 cursor-pointer"
                onClick={cancel}
              />
            </div>
            <div onPaste={handlePaste} className={classNames({ poll: Boolean(note.pollOptions) })}>
              <Textarea
                className="!border-none !resize-none !p-0 !rounded-none !text-sm"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                autoFocus={true}
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
          </div>
        )}
        {uploader.progress.length > 0 && <FileUploadProgress progress={uploader.progress} />}
        {(note.otherEvents?.length ?? 0) > 0 && !note.preview && (
          <div className="flex gap-2 flex-wrap">
            {note.otherEvents
              ?.map(a => ({
                event: a,
                tags: readNip94Tags(a.tags),
              }))
              .filter(a => a.tags.url)
              .map(a => (
                <div key={a.tags.url} className="relative">
                  <img
                    className="object-cover w-[80px] h-[80px] !mt-0 rounded-lg"
                    src={addExtensionToNip94Url(a.tags)}
                  />
                  <Icon
                    name="x"
                    className="absolute -top-[0.25rem] -right-[0.25rem] bg-gray rounded-full cursor-pointer"
                    onClick={() =>
                      note.update(
                        n => (n.otherEvents = n.otherEvents?.filter(b => readNip94Tags(b.tags).url !== a.tags.url)),
                      )
                    }
                  />
                </div>
              ))}
          </div>
        )}
        {noteCreatorFooter()}
        {note.error && <span className="error">{note.error}</span>}
        {note.advanced && noteCreatorAdvanced()}
        <Flyout
          show={note.filePicker !== "hidden"}
          width={note.filePicker !== "compact" ? "70vw" : undefined}
          onClose={() => note.update(v => (v.filePicker = "hidden"))}
          side="right"
          title={
            <div className="text-xl font-medium">
              <FormattedMessage defaultMessage="Attach Media" />
            </div>
          }
          actions={
            <>
              <IconButton
                icon={{
                  name: "expand",
                }}
                onClick={() => note.update(n => (n.filePicker = n.filePicker === "wide" ? "compact" : "wide"))}
              />
            </>
          }>
          <div className="overflow-y-auto h-[calc(100%-2rem)]">
            {note.filePicker !== "hidden" && (
              <MediaServerFileList
                onPicked={files => {
                  note.update(n => {
                    n.otherEvents ??= [];
                    n.otherEvents?.push(...files);
                    n.filePicker = "hidden";
                  });
                }}
                cols={note.filePicker === "compact" ? 2 : 6}
              />
            )}
          </div>
        </Flyout>
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
    <Modal id="note-creator" bodyClassName="modal-body gap-4" onClose={reset}>
      {noteCreatorForm()}
    </Modal>
  );
}
