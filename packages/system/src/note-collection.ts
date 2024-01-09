import { appendDedupe, SortedMap } from "@snort/shared";
import { EventExt, EventType, TaggedNostrEvent, u256 } from ".";
import { findTag } from "./utils";
import EventEmitter from "eventemitter3";

export interface StoreSnapshot<TSnapshot extends NoteStoreSnapshotData> {
  data: TSnapshot | undefined;
  clear: () => void;
  loading: () => boolean;
  add: (ev: Readonly<TaggedNostrEvent> | Readonly<Array<TaggedNostrEvent>>) => void;
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
} as StoreSnapshot<Array<TaggedNostrEvent>>;

export type NoteStoreSnapshotData = Array<TaggedNostrEvent> | TaggedNostrEvent;
export type NoteStoreHook = () => void;
export type NoteStoreHookRelease = () => void;
export type OnEventCallback = (e: Readonly<Array<TaggedNostrEvent>>) => void;
export type OnEventCallbackRelease = () => void;
export type OnEoseCallback = (c: string) => void;
export type OnEoseCallbackRelease = () => void;

export interface NosteStoreEvents {
  progress: (loading: boolean) => void;
  event: (evs: Readonly<Array<TaggedNostrEvent>>) => void;
}

/**
 * Generic note store interface
 */
export abstract class NoteStore extends EventEmitter<NosteStoreEvents> {
  abstract add(ev: Readonly<TaggedNostrEvent> | Readonly<Array<TaggedNostrEvent>>): void;
  abstract clear(): void;
  abstract getSnapshotData(): NoteStoreSnapshotData | undefined;

  abstract get snapshot(): StoreSnapshot<NoteStoreSnapshotData>;
  abstract get loading(): boolean;
  abstract set loading(v: boolean);
}

export abstract class HookedNoteStore<TSnapshot extends NoteStoreSnapshotData> extends NoteStore {
  #loading = true;
  #storeSnapshot: StoreSnapshot<TSnapshot> = {
    clear: () => this.clear(),
    loading: () => this.loading,
    add: ev => this.add(ev),
    data: undefined,
  };
  #needsSnapshot = true;
  #nextNotifyTimer?: ReturnType<typeof setTimeout>;
  #bufEmit: Array<TaggedNostrEvent> = [];

  get snapshot() {
    this.#updateSnapshot();
    return this.#storeSnapshot;
  }

  get loading() {
    return this.#loading;
  }

  set loading(v: boolean) {
    this.#loading = v;
    this.emit("progress", v);
  }

  abstract override add(ev: Readonly<TaggedNostrEvent> | Readonly<Array<TaggedNostrEvent>>): void;
  abstract override clear(): void;

  getSnapshotData() {
    this.#updateSnapshot();
    return this.#storeSnapshot.data;
  }

  protected abstract takeSnapshot(): TSnapshot | undefined;

  protected onChange(changes: Readonly<Array<TaggedNostrEvent>>): void {
    this.#needsSnapshot = true;
    this.#bufEmit.push(...changes);
    if (!this.#nextNotifyTimer) {
      this.#nextNotifyTimer = setTimeout(() => {
        this.#nextNotifyTimer = undefined;
        this.emit("event", this.#bufEmit);
        this.#bufEmit = [];
      }, 500);
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
 * A store which doesnt store anything, useful for hooks only
 */
export class NoopStore extends HookedNoteStore<Array<TaggedNostrEvent>> {
  override add(ev: readonly TaggedNostrEvent[] | Readonly<TaggedNostrEvent>): void {
    this.onChange(Array.isArray(ev) ? ev : [ev]);
  }

  override clear(): void {
    // nothing to do
  }

  protected override takeSnapshot(): TaggedNostrEvent[] | undefined {
    // nothing to do
    return undefined;
  }
}

/**
 * A simple flat container of events with no duplicates
 */
export class FlatNoteStore extends HookedNoteStore<Array<TaggedNostrEvent>> {
  #events: Array<TaggedNostrEvent> = [];
  #ids: Set<u256> = new Set();

  add(ev: TaggedNostrEvent | Array<TaggedNostrEvent>) {
    ev = Array.isArray(ev) ? ev : [ev];
    const changes: Array<TaggedNostrEvent> = [];
    ev.forEach(a => {
      if (!this.#ids.has(a.id)) {
        this.#events.push(a);
        this.#ids.add(a.id);
        changes.push(a);
      } else {
        const existing = this.#events.findIndex(b => b.id === a.id);
        if (existing !== -1) {
          this.#events[existing].relays = appendDedupe(this.#events[existing].relays, a.relays);
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
export class KeyedReplaceableNoteStore extends HookedNoteStore<Array<TaggedNostrEvent>> {
  #keyFn: (ev: TaggedNostrEvent) => string;
  #events: SortedMap<string, TaggedNostrEvent> = new SortedMap([], (a, b) => b[1].created_at - a[1].created_at);

  constructor(fn: (ev: TaggedNostrEvent) => string) {
    super();
    this.#keyFn = fn;
  }

  add(ev: TaggedNostrEvent | Array<TaggedNostrEvent>) {
    ev = Array.isArray(ev) ? ev : [ev];
    const changes: Array<TaggedNostrEvent> = [];
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
export class ReplaceableNoteStore extends HookedNoteStore<Readonly<TaggedNostrEvent>> {
  #event?: TaggedNostrEvent;

  add(ev: TaggedNostrEvent | Array<TaggedNostrEvent>) {
    ev = Array.isArray(ev) ? ev : [ev];
    const changes: Array<TaggedNostrEvent> = [];
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
      return { ...this.#event };
    }
  }
}

/**
 * General use note store based on kind ranges
 */
export class NoteCollection extends KeyedReplaceableNoteStore {
  constructor() {
    super(e => {
      switch (EventExt.getType(e.kind)) {
        case EventType.ParameterizedReplaceable:
          return `${e.kind}:${e.pubkey}:${findTag(e, "d")}`;
        case EventType.Replaceable:
          return `${e.kind}:${e.pubkey}`;
        default:
          return e.id;
      }
    });
  }
}
