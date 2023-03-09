import { TaggedRawEvent, u256 } from "@snort/nostr";

export type NoteStoreSnapshot = Readonly<Array<TaggedRawEvent>> | Readonly<TaggedRawEvent>;
export type NoteStoreHook = () => void;
export type NoteStoreHookRelease = () => void;

/**
 * Generic note store interface
 */
export abstract class NoteStore {
  abstract addNote(ev: TaggedRawEvent): void;
  abstract clear(): void;
  abstract hook(cb: NoteStoreHook): NoteStoreHookRelease;
  abstract getSnapshot(): NoteStoreSnapshot | undefined;
}

export abstract class HookedNoteStore<TSnapshot extends NoteStoreSnapshot> implements NoteStore {
  #hooks: Array<NoteStoreHook> = [];
  #snapshot?: TSnapshot;

  abstract addNote(ev: TaggedRawEvent): void;
  abstract clear(): void;

  hook(cb: NoteStoreHook): NoteStoreHookRelease {
    this.#hooks.push(cb);
    return () => {
      const idx = this.#hooks.findIndex(a => a === cb);
      this.#hooks.splice(idx, 1);
    };
  }

  getSnapshot(): TSnapshot | undefined {
    return this.#snapshot as TSnapshot;
  }

  protected abstract takeSnapshot(): TSnapshot | undefined;

  protected onChange(): void {
    this.#snapshot = this.takeSnapshot();
    for (const hk of this.#hooks) {
      hk();
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

  addNote(ev: TaggedRawEvent) {
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

  addNote(ev: TaggedRawEvent) {
    if (!this.#ids.has(ev.id)) {
      this.#events.push(ev);
      this.#ids.add(ev.id);
      this.onChange();
    }
  }

  clear() {
    this.#events = [];
    this.#ids.clear();
    this.onChange();
  }

  takeSnapshot() {
    return [...this.#events];
  }
}

/**
 * A note store that holds a single replaceable event
 */
export class ReplaceableNoteStore extends HookedNoteStore<Readonly<TaggedRawEvent>> {
  #event?: TaggedRawEvent;

  addNote(ev: TaggedRawEvent) {
    const existingCreated = this.#event?.created_at ?? 0;
    if (ev.created_at > existingCreated) {
      this.#event = ev;
      this.onChange();
    }
  }

  clear() {
    this.#event = undefined;
    this.onChange();
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
export class PubkeyReplaceableNoteStore extends HookedNoteStore<Readonly<Array<TaggedRawEvent>>> {
  #events: Map<string, TaggedRawEvent> = new Map();

  addNote(ev: TaggedRawEvent) {
    const keyOnEvent = ev.pubkey;
    const existingCreated = this.#events.get(keyOnEvent)?.created_at ?? 0;
    if (ev.created_at > existingCreated) {
      this.#events.set(keyOnEvent, ev);
      this.onChange();
    }
  }

  clear() {
    this.#events.clear();
    this.onChange();
  }

  takeSnapshot() {
    return [...this.#events.values()];
  }
}
