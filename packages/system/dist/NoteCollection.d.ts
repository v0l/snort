import { TaggedRawEvent } from ".";
export interface StoreSnapshot<TSnapshot> {
    data: TSnapshot | undefined;
    clear: () => void;
    loading: () => boolean;
    add: (ev: Readonly<TaggedRawEvent> | Readonly<Array<TaggedRawEvent>>) => void;
}
export declare const EmptySnapshot: StoreSnapshot<FlatNoteStore>;
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
export declare abstract class NoteStore {
    abstract add(ev: Readonly<TaggedRawEvent> | Readonly<Array<TaggedRawEvent>>): void;
    abstract clear(): void;
    abstract hook(cb: NoteStoreHook): NoteStoreHookRelease;
    abstract getSnapshotData(): NoteStoreSnapshotData | undefined;
    abstract onEvent(cb: OnEventCallback): OnEventCallbackRelease;
    abstract get snapshot(): StoreSnapshot<NoteStoreSnapshotData>;
    abstract get loading(): boolean;
    abstract set loading(v: boolean);
}
export declare abstract class HookedNoteStore<TSnapshot extends NoteStoreSnapshotData> implements NoteStore {
    #private;
    get snapshot(): StoreSnapshot<TSnapshot>;
    get loading(): boolean;
    set loading(v: boolean);
    abstract add(ev: Readonly<TaggedRawEvent> | Readonly<Array<TaggedRawEvent>>): void;
    abstract clear(): void;
    hook(cb: NoteStoreHook): NoteStoreHookRelease;
    getSnapshotData(): TSnapshot | undefined;
    onEvent(cb: OnEventCallback): OnEventCallbackRelease;
    protected abstract takeSnapshot(): TSnapshot | undefined;
    protected onChange(changes: Readonly<Array<TaggedRawEvent>>): void;
}
/**
 * A simple flat container of events with no duplicates
 */
export declare class FlatNoteStore extends HookedNoteStore<Readonly<Array<TaggedRawEvent>>> {
    #private;
    add(ev: TaggedRawEvent | Array<TaggedRawEvent>): void;
    clear(): void;
    takeSnapshot(): TaggedRawEvent[];
}
/**
 * A note store that holds a single replaceable event for a given user defined key generator function
 */
export declare class KeyedReplaceableNoteStore extends HookedNoteStore<Readonly<Array<TaggedRawEvent>>> {
    #private;
    constructor(fn: (ev: TaggedRawEvent) => string);
    add(ev: TaggedRawEvent | Array<TaggedRawEvent>): void;
    clear(): void;
    takeSnapshot(): TaggedRawEvent[];
}
/**
 * A note store that holds a single replaceable event
 */
export declare class ReplaceableNoteStore extends HookedNoteStore<Readonly<TaggedRawEvent>> {
    #private;
    add(ev: TaggedRawEvent | Array<TaggedRawEvent>): void;
    clear(): void;
    takeSnapshot(): Readonly<{
        relays: string[];
        id: string;
        pubkey: string;
        created_at: number;
        kind: number;
        tags: string[][];
        content: string;
        sig: string;
    }> | undefined;
}
/**
 * A note store that holds a single replaceable event per pubkey
 */
export declare class PubkeyReplaceableNoteStore extends KeyedReplaceableNoteStore {
    constructor();
}
/**
 * A note store that holds a single replaceable event per "pubkey-dtag"
 */
export declare class ParameterizedReplaceableNoteStore extends KeyedReplaceableNoteStore {
    constructor();
}
//# sourceMappingURL=NoteCollection.d.ts.map