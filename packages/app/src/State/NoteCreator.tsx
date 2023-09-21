import { ExternalStore } from "@snort/shared";
import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ZapTarget } from "Zapper";
import { useSyncExternalStore } from "react";

interface NoteCreatorDataSnapshot {
  show: boolean;
  note: string;
  error: string;
  active: boolean;
  advanced: boolean;
  preview?: NostrEvent;
  replyTo?: TaggedNostrEvent;
  selectedCustomRelays?: Array<string>;
  zapSplits?: Array<ZapTarget>;
  sensitive?: string;
  pollOptions?: Array<string>;
  otherEvents?: Array<NostrEvent>;
  reset: () => void;
  update: (fn: (v: NoteCreatorDataSnapshot) => void) => void;
}

class NoteCreatorStore extends ExternalStore<NoteCreatorDataSnapshot> {
  #data: NoteCreatorDataSnapshot;

  constructor() {
    super();
    this.#data = {
      show: false,
      note: "",
      error: "",
      active: false,
      advanced: false,
      reset: () => {
        this.#reset(this.#data);
        this.notifyChange();
      },
      update: (fn: (v: NoteCreatorDataSnapshot) => void) => {
        fn(this.#data);
        this.notifyChange();
      },
    };
  }

  #reset(d: NoteCreatorDataSnapshot) {
    d.show = false;
    d.note = "";
    d.error = "";
    d.active = false;
    d.advanced = false;
    d.preview = undefined;
    d.replyTo = undefined;
    d.selectedCustomRelays = undefined;
    d.zapSplits = undefined;
    d.sensitive = undefined;
    d.pollOptions = undefined;
    d.otherEvents = undefined;
  }

  takeSnapshot(): NoteCreatorDataSnapshot {
    const sn = {
      ...this.#data,
      reset: () => {
        this.#reset(this.#data);
      },
      update: (fn: (v: NoteCreatorDataSnapshot) => void) => {
        fn(this.#data);
        console.debug(this.#data);
        this.notifyChange();
      },
    } as NoteCreatorDataSnapshot;
    return sn;
  }
}

const NoteCreatorState = new NoteCreatorStore();

export function useNoteCreator() {
  return useSyncExternalStore(
    c => NoteCreatorState.hook(c),
    () => NoteCreatorState.snapshot(),
  );
}
