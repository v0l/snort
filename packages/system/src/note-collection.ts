import { appendDedupe } from "@snort/shared";
import { TaggedRawEvent, u256 } from ".";
import { findTag } from "./utisl";

export interface StoreSnapshot<TSnapshot> {
  data: TSnapshot | undefined;
  clear: () => void;
  loading: () => boolean;
  add: (ev: Readonly<TaggedRawEvent> | Readonly<Array<TaggedRawEvent>>) => void;
}

export const EmptySnapshot = {
  data: undefined,
  clear: () => {
    // empty
  },
  loading: () => true,
  add: () => {
    // empty
  },
} as StoreSnapshot<FlatNoteStore>;

export type NoteStoreSnapshotData = Readonly<Array<TaggedRawEvent>> | Readonly<TaggedRawEvent>;
export type NoteStoreHook = () => void;
export type NoteStoreHookRelease = () => void;
export type OnEventCallback = (e: Readonly<Array<TaggedRawEvent>>) => void;
export type OnEventCallbackRelease = () => void;
export type OnEoseCallback = (c: string) => void;
export type OnEoseCallbackRelease = () => void;

/**
 * Generic note store interface
 */
export abstract class NoteStore {
  abstract add(ev: Readonly<TaggedRawEvent> | Readonly<Array<TaggedRawEvent>>): void;
  abstract clear(): void;

  // react hooks
  abstract hook(cb: NoteStoreHook): NoteStoreHookRelease;
  abstract getSnapshotData(): NoteStoreSnapshotData | undefined;

  // events
  abstract onEvent(cb: OnEventCallback): OnEventCallbackRelease;

  abstract get snapshot(): StoreSnapshot<NoteStoreSnapshotData>;
  abstract get loading(): boolean;
  abstract set loading(v: boolean);
}

export abstract class HookedNoteStore<TSnapshot extends NoteStoreSnapshotData> implements NoteStore {
  #hooks: Array<NoteStoreHook> = [];
  #eventHooks: Array<OnEventCallback> = [];
  #loading = true;
  #storeSnapshot: StoreSnapshot<TSnapshot> = {
    clear: () => this.clear(),
    loading: () => this.loading,
    add: ev => this.add(ev),
    data: undefined,
  };
  #needsSnapshot = true;
  #nextNotifyTimer?: ReturnType<typeof setTimeout>;

  get snapshot() {
    this.#updateSnapshot();
    return this.#storeSnapshot;
  }

  get loading() {
    return this.#loading;
  }

  set loading(v: boolean) {
    this.#loading = v;
    this.onChange([]);
  }

  abstract add(ev: Readonly<TaggedRawEvent> | Readonly<Array<TaggedRawEvent>>): void;
  abstract clear(): void;

  hook(cb: NoteStoreHook): NoteStoreHookRelease {
    this.#hooks.push(cb);
    return () => {
      const idx = this.#hooks.findIndex(a => a === cb);
      this.#hooks.splice(idx, 1);
    };
  }

  getSnapshotData() {
    this.#updateSnapshot();
    return this.#storeSnapshot.data;
  }

  onEvent(cb: OnEventCallback): OnEventCallbackRelease {
    const existing = this.#eventHooks.find(a => a === cb);
    if (!existing) {
      this.#eventHooks.push(cb);
      return () => {
        const idx = this.#eventHooks.findIndex(a => a === cb);
        this.#eventHooks.splice(idx, 1);
      };
    }
    return () => {
      //noop
    };
  }

  protected abstract takeSnapshot(): TSnapshot | undefined;

  protected onChange(changes: Readonly<Array<TaggedRawEvent>>): void {
    this.#needsSnapshot = true;
    if (!this.#nextNotifyTimer) {
      this.#nextNotifyTimer = setTimeout(() => {
        this.#nextNotifyTimer = undefined;
        for (const hk of this.#hooks) {
          hk();
        }
      }, 500);
    }
    if (changes.length > 0) {
      for (const hkE of this.#eventHooks) {
        hkE(changes);
      }
    }
  }

  #updateSnapshot() {
    if (this.#needsSnapshot) {
      this.#storeSnapshot = {
        ...this.#storeSnapshot,
        data: this.takeSnapshot(),
      };
      this.#needsSnapshot = false;
    }
  }
}

/**
 * A simple flat container of events with no duplicates
 */
export class FlatNoteStore extends HookedNoteStore<Readonly<Array<TaggedRawEvent>>> {
  #events: Array<TaggedRawEvent> = [];
  #ids: Set<u256> = new Set();

  add(ev: TaggedRawEvent | Array<TaggedRawEvent>) {
    ev = Array.isArray(ev) ? ev : [ev];
    const changes: Array<TaggedRawEvent> = [];
    ev.forEach(a => {
      if (!this.#ids.has(a.id)) {
        this.#events.push(a);
        this.#ids.add(a.id);
        changes.push(a);
      } else {
        const existing = this.#events.find(b => b.id === a.id);
        if (existing) {
          existing.relays = appendDedupe(existing.relays, a.relays);
        }
      }
    });

    if (changes.length > 0) {
      this.onChange(changes);
    }
  }

  clear() {
    this.#events = [];
    this.#ids.clear();
    this.onChange([]);
  }

  takeSnapshot() {
    return [...this.#events];
  }
}

/**
 * A note store that holds a single replaceable event for a given user defined key generator function
 */
export class KeyedReplaceableNoteStore extends HookedNoteStore<Readonly<Array<TaggedRawEvent>>> {
  #keyFn: (ev: TaggedRawEvent) => string;
  #events: Map<string, TaggedRawEvent> = new Map();

  constructor(fn: (ev: TaggedRawEvent) => string) {
    super();
    this.#keyFn = fn;
  }

  add(ev: TaggedRawEvent | Array<TaggedRawEvent>) {
    ev = Array.isArray(ev) ? ev : [ev];
    const changes: Array<TaggedRawEvent> = [];
    ev.forEach(a => {
      const keyOnEvent = this.#keyFn(a);
      const existingCreated = this.#events.get(keyOnEvent)?.created_at ?? 0;
      if (a.created_at > existingCreated) {
        this.#events.set(keyOnEvent, a);
        changes.push(a);
      }
    });
    if (changes.length > 0) {
      this.onChange(changes);
    }
  }

  clear() {
    this.#events.clear();
    this.onChange([]);
  }

  takeSnapshot() {
    return [...this.#events.values()];
  }
}

/**
 * A note store that holds a single replaceable event
 */
export class ReplaceableNoteStore extends HookedNoteStore<Readonly<TaggedRawEvent>> {
  #event?: TaggedRawEvent;

  add(ev: TaggedRawEvent | Array<TaggedRawEvent>) {
    ev = Array.isArray(ev) ? ev : [ev];
    const changes: Array<TaggedRawEvent> = [];
    ev.forEach(a => {
      const existingCreated = this.#event?.created_at ?? 0;
      if (a.created_at > existingCreated) {
        this.#event = a;
        changes.push(a);
      }
    });
    if (changes.length > 0) {
      this.onChange(changes);
    }
  }

  clear() {
    this.#event = undefined;
    this.onChange([]);
  }

  takeSnapshot() {
    if (this.#event) {
      return Object.freeze({ ...this.#event });
    }
  }
}

/**
 * A note store that holds a single replaceable event per pubkey
 */
export class PubkeyReplaceableNoteStore extends KeyedReplaceableNoteStore {
  constructor() {
    super(e => e.pubkey);
  }
}

/**
 * A note store that holds a single replaceable event per "pubkey-dtag"
 */
export class ParameterizedReplaceableNoteStore extends KeyedReplaceableNoteStore {
  constructor() {
    super(ev => {
      const dTag = findTag(ev, "d");
      return `${ev.pubkey}-${dTag}`;
    });
  }
}
