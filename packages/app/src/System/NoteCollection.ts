import { TaggedRawEvent, u256 } from "@snort/nostr";
import { findTag } from "Util";

export interface StoreSnapshot<TSnapshot> {
  data: TSnapshot | undefined;
  store: NoteStore;
}

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
  abstract eose(c: string): void;

  // react hooks
  abstract hook(cb: NoteStoreHook): NoteStoreHookRelease;
  abstract getSnapshotData(): NoteStoreSnapshotData | undefined;

  // events
  abstract onEvent(cb: OnEventCallback): OnEventCallbackRelease;
  abstract onEose(cb: OnEoseCallback): OnEoseCallback;

  abstract get snapshot(): StoreSnapshot<NoteStoreSnapshotData>;
  abstract get loading(): boolean;
  abstract set loading(v: boolean);
}

export abstract class HookedNoteStore<TSnapshot extends NoteStoreSnapshotData> implements NoteStore {
  #hooks: Array<NoteStoreHook> = [];
  #eventHooks: Array<OnEventCallback> = [];
  #eoseHooks: Array<OnEoseCallback> = [];
  #loading = true;
  #storeSnapshot: StoreSnapshot<TSnapshot> = {
    store: this,
    data: undefined,
  };
  #needsSnapshot = true;

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

  abstract add(ev: TaggedRawEvent | Array<TaggedRawEvent>): void;
  abstract clear(): void;

  eose(c: string): void {
    for (const hkE of this.#eoseHooks) {
      hkE(c);
    }
  }

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
    this.#eventHooks.push(cb);
    return () => {
      const idx = this.#eventHooks.findIndex(a => a === cb);
      this.#eventHooks.splice(idx, 1);
    };
  }

  onEose(cb: OnEoseCallback): OnEoseCallback {
    this.#eoseHooks.push(cb);
    return () => {
      const idx = this.#eoseHooks.findIndex(a => a === cb);
      this.#eoseHooks.splice(idx, 1);
    };
  }

  protected abstract takeSnapshot(): TSnapshot | undefined;

  protected onChange(changes: Readonly<Array<TaggedRawEvent>>): void {
    this.#needsSnapshot = true;
    for (const hk of this.#hooks) {
      hk();
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
        data: this.takeSnapshot(),
        store: this,
      };
      this.#needsSnapshot = false;
    }
  }
}

export type Node = Map<u256, Array<NodeBranch>>;
export type NodeBranch = TaggedRawEvent | Node;

/**
 * Tree note store
 */
export class NostrEventTree extends HookedNoteStore<TaggedRawEvent> {
  base: Node = new Map();
  #nodeIndex: Map<u256, Node> = new Map();

  add(ev: TaggedRawEvent | Array<TaggedRawEvent>) {
    throw new Error("Not implemented");
  }

  clear(): void {
    throw new Error("Method not implemented.");
  }

  takeSnapshot(): TaggedRawEvent {
    throw new Error("Method not implemented.");
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
