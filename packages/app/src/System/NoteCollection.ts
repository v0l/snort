import { TaggedRawEvent, u256 } from "@snort/nostr";

export type Node = Map<u256, Array<NodeBranch>>;
export type NodeBranch = TaggedRawEvent | Node;

/**
 * Tree note store
 */
export class NostrEventTree {
  base: Node;
  #nodeIndex: Map<u256, Node>;

  constructor() {
    this.base = new Map();
    this.#nodeIndex = new Map();
  }

  addNote(ev: TaggedRawEvent) {
    throw new Error("Not implemented");
  }
}

export interface NoteStore {
  addNote(ev: TaggedRawEvent): void;
  clear(): void;
}

/**
 * A simple flat container of events with no duplicates
 */
export class FlatNoteStore implements NoteStore {
  events: Array<TaggedRawEvent> = [];
  #ids: Set<u256> = new Set();

  addNote(ev: TaggedRawEvent) {
    if (!this.#ids.has(ev.id)) {
      this.events.push(ev);
      this.#ids.add(ev.id);
    }
  }

  clear() {
    this.events = [];
    this.#ids.clear();
  }
}

/**
 * A note store that holds a single replaceable event
 */
export class ReplaceableNoteStore implements NoteStore {
  event?: TaggedRawEvent;

  addNote(ev: TaggedRawEvent) {
    const existingCreated = this.event?.created_at ?? 0;
    if (ev.created_at > existingCreated) {
      this.event = ev;
    }
  }

  clear() {
    this.event = undefined;
  }
}
