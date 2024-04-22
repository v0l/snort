import { SortedMap, dedupe } from "@snort/shared";
import { EventExt, EventType, TaggedNostrEvent } from ".";
import { findTag } from "./utils";
import { EventEmitter } from "eventemitter3";

export const EmptySnapshot: NoteStoreSnapshotData = [];
export type NoteStoreSnapshotData = Array<TaggedNostrEvent>;
export type NoteStoreHook = () => void;
export type NoteStoreHookRelease = () => void;
export type OnEventCallback = (e: Readonly<Array<TaggedNostrEvent>>) => void;
export type OnEventCallbackRelease = () => void;
export type OnEoseCallback = (c: string) => void;
export type OnEoseCallbackRelease = () => void;

export interface NosteStoreEvents {
  event: (evs: Array<TaggedNostrEvent>) => void;
}

/**
 * Generic note store interface
 */
export abstract class NoteStore extends EventEmitter<NosteStoreEvents> {
  abstract add(ev: Readonly<TaggedNostrEvent> | Readonly<Array<TaggedNostrEvent>>): void;
  abstract clear(): void;

  abstract get snapshot(): NoteStoreSnapshotData;
}

export abstract class HookedNoteStore extends NoteStore {
  #storeSnapshot: NoteStoreSnapshotData = [];
  #nextEmit?: ReturnType<typeof setTimeout>;
  #bufEmit: Array<TaggedNostrEvent> = [];

  get snapshot() {
    return this.#storeSnapshot;
  }

  abstract override add(ev: Readonly<TaggedNostrEvent> | Readonly<Array<TaggedNostrEvent>>): void;
  abstract override clear(): void;
  protected abstract takeSnapshot(): NoteStoreSnapshotData | undefined;

  protected onChange(changes: Array<TaggedNostrEvent>): void {
    this.#storeSnapshot = this.takeSnapshot() ?? [];
    this.#bufEmit.push(...changes);
    if (!this.#nextEmit) {
      this.#nextEmit = setTimeout(() => {
        this.#nextEmit = undefined;
        this.emit("event", this.#bufEmit);
        this.#bufEmit = [];
      }, 300);
    }
  }
}

/**
 * A note store that holds a single replaceable event for a given user defined key generator function
 */
export class KeyedReplaceableNoteStore extends HookedNoteStore {
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
      const existing = this.#events.get(keyOnEvent);
      if (a.created_at > (existing?.created_at ?? 0)) {
        if (existing) {
          a.relays = dedupe([...existing.relays, ...a.relays]);
        }
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
