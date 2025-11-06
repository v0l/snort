/* eslint-disable max-lines */
import { fetchNip05Pubkey, NostrPrefix, unixNow } from "@snort/shared";
import {
  EventBuilder,
  EventKind,
  LinkScope,
  Nip18,
  Nip94Tags,
  nip94TagsToIMeta,
  NostrLink,
  readNip94Tags,
  TaggedNostrEvent,
  tryParseNostrLink,
} from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { ZapTarget } from "@snort/wallet";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import classNames from "classnames";
import { ClipboardEventHandler, DragEvent, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import { AsyncIcon } from "@/Components/Button/AsyncIcon";
import CloseButton from "@/Components/Button/CloseButton";
import IconButton from "@/Components/Button/IconButton";
import { sendEventToRelays } from "@/Components/Event/Create/util";
import Note, { NoteProps, NotePropsOptions } from "@/Components/Event/EventComponent";
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
import useFileUpload from "@/Utils/Upload";
import { GetPowWorker } from "@/Utils/wasm";

import { OkResponseRow } from "./OkResponseRow";

const previewNoteOptions = {
  showContextMenu: false,
  showFooter: false,
  canClick: false,
  showTime: false,
} as NotePropsOptions;

const replyToNoteOptions = {
  showFooter: false,
  showContextMenu: false,
  showProfileCard: false,
  showTime: false,
  canClick: false,
  longFormPreview: true,
  showMedia: false,
} as NotePropsOptions;

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
        if (note.pollOptions) {
          extraTags ??= [];
          extraTags.push(...note.pollOptions.map((a, i) => ["poll_option", i.toString(), a]));
        }
        if (note.hashTags.length > 0) {
          extraTags ??= [];
          extraTags.push(...note.hashTags.map(a => ["t", a.toLowerCase()]));
        }

        // attach 1 link and use other duplicates as fallback urls
        for (const [, v] of Object.entries(note.attachments ?? {})) {
          const at = v[0];
          note.note += note.note.length > 0 ? `\n${at.url}` : at.url;
          const n94 =
            (at.nip94?.length ?? 0) > 0
              ? readNip94Tags(at.nip94!)
              : ({
                  url: at.url,
                  hash: at.sha256,
                  size: at.size,
                  mimeType: at.type,
                } as Nip94Tags);

          // attach fallbacks
          n94.fallback ??= [];
          n94.fallback.push(
            ...v
              .slice(1)
              .filter(a => a.url)
              .map(a => a.url!),
          );

          extraTags ??= [];
          extraTags.push(nip94TagsToIMeta(n94));
        }

        // add quote repost
        if (note.quote) {
          if (!note.note.endsWith("\n")) {
            note.note += "\n";
          }
          const link = NostrLink.fromEvent(note.quote);
          link.scope = LinkScope.Quote;

          note.note += `nostr:${link.encode(CONFIG.eventLinkPrefix)}`;
          const quoteTag = Nip18.linkToTag(link);
          extraTags ??= [];
          extraTags.push(quoteTag);
        }
        const hk = (eb: EventBuilder) => {
          extraTags?.forEach(t => eb.tag(t));
          note.extraTags?.forEach(t => eb.tag(t));
          if (note.pollOptions) {
            eb.kind(EventKind.Polls);
          }
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
        const rx = await uploader.upload(file);
        note.update(v => {
          if (rx.url) {
            v.attachments ??= {};
            v.attachments[rx.sha256] ??= [];
            v.attachments[rx.sha256].push(rx);
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
            <div className="w-max" key={`po-${i}`}>
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
            <div className="px-3 py-2 flex items-center justify-between bg-neutral-600 rounded-lg" key={r}>
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
        <div className="flex flex-col gap-2">
          <h4>
            <FormattedMessage defaultMessage="Zap Splits" />
          </h4>
          <FormattedMessage defaultMessage="Zaps on this note will be split to the following users." />
          <div className="flex flex-col gap-2">
            {[...(note.zapSplits ?? [])].map((v: ZapTarget, i, arr) => (
              <div className="flex items-center gap-2" key={`${v.name}-${v.value}`}>
                <div className="flex flex-col flex-4 gap-1">
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
                <div className="flex flex-col flex-1 gap-1">
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
                <div className="flex flex-col gap-1">
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
          <span className="text-warning">
            <FormattedMessage defaultMessage="Not all clients support this, you may still receive some zaps as if zap splits was not configured" />
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h4>
            <FormattedMessage defaultMessage="Sensitive Content" />
          </h4>
          <FormattedMessage defaultMessage="Users must accept the content warning to show the content of your note." />
          <input
            className="w-full"
            type="text"
            value={note.sensitive}
            onChange={e => note.update(v => (v.sensitive = e.target.value))}
            maxLength={50}
            minLength={1}
            placeholder={formatMessage({
              defaultMessage: "Reason",
            })}
          />
          <span className="text-warning">
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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <span>
                <AsyncIcon
                  iconName="attachment"
                  iconSize={24}
                  className="hover:text-gray-superlight transition cursor-pointer"
                />
              </span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-layer-2 rounded-lg overflow-hidden z-[9999] min-w-48" sideOffset={5}>
                <DropdownMenu.Item
                  className="px-6 py-2 text-base font-semibold bg-layer-2 light:bg-white hover:bg-layer-3 light:hover:bg-neutral-200 cursor-pointer outline-none"
                  onClick={e => {
                    e.stopPropagation();
                    note.update(s => (s.filePicker = "compact"));
                  }}>
                  <FormattedMessage defaultMessage="From Server" />
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="px-6 py-2 text-base font-semibold bg-layer-2 light:bg-white hover:bg-layer-3 light:hover:bg-neutral-200 cursor-pointer outline-none"
                  onClick={e => {
                    e.stopPropagation();
                    attachFile();
                  }}>
                  <FormattedMessage defaultMessage="From File" />
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

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
        <AsyncButton onClick={onSubmit} className="bg-primary">
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
      <div className="flex flex-col gap-4">
        {note.replyTo && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Reply To" />
            </h4>
            <div className="max-h-64 overflow-y-auto">
              <Note data={note.replyTo} options={replyToNoteOptions} />
            </div>
            <hr />
          </>
        )}
        {note.quote && (
          <>
            <h4>
              <FormattedMessage defaultMessage="Quote Repost" />
            </h4>
            <div className="max-h-64 overflow-y-auto">
              <Note data={note.quote} options={replyToNoteOptions} />
            </div>
            <hr />
          </>
        )}
        {note.preview && getPreviewNote()}
        {!note.preview && (
          <div className="flex flex-col gap-4">
            <div className="font-medium flex justify-between items-center">
              <FormattedMessage defaultMessage="Compose a note" />
              <AsyncIcon
                iconName="x"
                className="bg-neutral-600 rounded-full items-center justify-center flex p-1 cursor-pointer"
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
        {Object.entries(note.attachments ?? {}).length > 0 && !note.preview && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(note.attachments ?? {}).map(([k, v]) => (
              <div key={k} className="relative">
                <img className="object-cover w-[80px] h-[80px] !mt-0 rounded-lg" src={v[0].url} />
                <Icon
                  name="x"
                  className="absolute -top-1 -right-1 bg-neutral-600 rounded-full cursor-pointer"
                  onClick={() =>
                    note.update(n => {
                      if (n.attachments?.[k]) {
                        delete n.attachments[k];
                      }
                      return n;
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
        {noteCreatorFooter()}
        {note.error && <span className="text-error">{note.error}</span>}
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
                className="max-lg:!hidden"
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
                    for (const x of files) {
                      n.attachments ??= {};
                      n.attachments[x.sha256] ??= [];
                      n.attachments[x.sha256].push(x);
                    }
                    n.filePicker = "hidden";
                  });
                }}
                cols={note.filePicker === "compact" ? 2 : 6}
              />
            )}
          </div>
        </Flyout>
      </div>
    );
  }

  function reset() {
    note.update(v => {
      v.show = false;
    });
  }

  if (!note.show) return null;
  return (
    <Modal id="note-creator" onClose={reset}>
      {noteCreatorForm()}
    </Modal>
  );
}
