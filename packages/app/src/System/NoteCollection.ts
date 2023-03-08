import { TaggedRawEvent, u256 } from "@snort/nostr";
import { unwrap } from "Util";

export type NoteStoreSnapshot = Readonly<Array<TaggedRawEvent>> | Readonly<TaggedRawEvent> | undefined;
export type NoteStoreHook = () => void;
export type NoteStoreHookRelease = () => void;

/**
 * Generic note store interface
 */
export interface NoteStore {
  addNote(ev: TaggedRawEvent): void;
  clear(): void;
  hook(cb: NoteStoreHook): NoteStoreHookRelease;
  getSnapshot(): NoteStoreSnapshot;
}

export abstract class HookedNoteStore implements NoteStore {
  #hooks: Array<NoteStoreHook> = [];
  #snapshot: NoteStoreSnapshot;

  abstract addNote(ev: TaggedRawEvent): void;
  abstract clear(): void;

  hook(cb: NoteStoreHook): NoteStoreHookRelease {
    this.#hooks.push(cb);
    return () => {
      const idx = this.#hooks.findIndex(a => a === cb);
      this.#hooks.splice(idx, 1);
    };
  }

  getSnapshot(): NoteStoreSnapshot {
    return this.#snapshot;
  }

  protected abstract takeSnapshot(): NoteStoreSnapshot;
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
export class NostrEventTree extends HookedNoteStore {
  base: Node = new Map();
  #nodeIndex: Map<u256, Node> = new Map();

  addNote(ev: TaggedRawEvent) {
    throw new Error("Not implemented");
  }

  clear(): void {
    throw new Error("Method not implemented.");
  }

  takeSnapshot(): readonly TaggedRawEvent[] {
    throw new Error("Method not implemented.");
  }
}

/**
 * A simple flat container of events with no duplicates
 */
export class FlatNoteStore extends HookedNoteStore {
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

  takeSnapshot(): NoteStoreSnapshot {
    return [...this.#events];
  }
}

/**
 * A note store that holds a single replaceable event
 */
export class ReplaceableNoteStore extends HookedNoteStore {
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

  takeSnapshot(): NoteStoreSnapshot {
    if (this.#event) {
      return Object.freeze({ ...this.#event });
    }
  }
}
