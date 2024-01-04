import { ExternalStore } from "@snort/shared";
import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

import { ZapTarget } from "@/Utils/Zapper";

interface NoteCreatorDataSnapshot {
  show: boolean;
  note: string;
  error: string;
  active: boolean;
  advanced: boolean;
  preview?: NostrEvent;
  replyTo?: TaggedNostrEvent;
  quote?: TaggedNostrEvent;
  selectedCustomRelays?: Array<string>;
  zapSplits?: Array<ZapTarget>;
  sensitive?: string;
  pollOptions?: Array<string>;
  otherEvents?: Array<NostrEvent>;
  extraTags?: Array<Array<string>>;
  sending?: Array<NostrEvent>;
  sendStarted: boolean;
  hashTags: Array<string>;
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
      sendStarted: false,
      hashTags: [],
      reset: () => {
        this.#reset(this.#data);
        this.notifyChange(this.#data);
      },
      update: (fn: (v: NoteCreatorDataSnapshot) => void) => {
        fn(this.#data);
        this.notifyChange(this.#data);
      },
    };
  }

  #reset(d: NoteCreatorDataSnapshot) {
    d.show = false;
    d.note = "";
    d.error = "";
    d.active = false;
    d.advanced = false;
    d.sendStarted = false;
    d.preview = undefined;
    d.replyTo = undefined;
    d.quote = undefined;
    d.selectedCustomRelays = undefined;
    d.zapSplits = undefined;
    d.sensitive = undefined;
    d.pollOptions = undefined;
    d.otherEvents = undefined;
    d.sending = undefined;
    d.extraTags = undefined;
    d.hashTags = [];
  }

  takeSnapshot(): NoteCreatorDataSnapshot {
    const sn = {
      ...this.#data,
      reset: () => {
        this.#reset(this.#data);
      },
      update: (fn: (v: NoteCreatorDataSnapshot) => void) => {
        fn(this.#data);
        this.notifyChange(this.#data);
      },
    } as NoteCreatorDataSnapshot;
    return sn;
  }
}

const NoteCreatorState = new NoteCreatorStore();

export function useNoteCreator<T extends object = NoteCreatorDataSnapshot>(
  selector?: (v: NoteCreatorDataSnapshot) => T,
) {
  const defaultSelector = (v: NoteCreatorDataSnapshot) => v as unknown as T;

  return useSyncExternalStoreWithSelector<NoteCreatorDataSnapshot, T>(
    c => NoteCreatorState.hook(c),
    () => NoteCreatorState.snapshot(),
    undefined,
    selector || defaultSelector,
  );
}
