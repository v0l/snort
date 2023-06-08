"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _HookedNoteStore_instances, _HookedNoteStore_hooks, _HookedNoteStore_eventHooks, _HookedNoteStore_loading, _HookedNoteStore_storeSnapshot, _HookedNoteStore_needsSnapshot, _HookedNoteStore_nextNotifyTimer, _HookedNoteStore_updateSnapshot, _FlatNoteStore_events, _FlatNoteStore_ids, _KeyedReplaceableNoteStore_keyFn, _KeyedReplaceableNoteStore_events, _ReplaceableNoteStore_event;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParameterizedReplaceableNoteStore = exports.PubkeyReplaceableNoteStore = exports.ReplaceableNoteStore = exports.KeyedReplaceableNoteStore = exports.FlatNoteStore = exports.HookedNoteStore = exports.NoteStore = exports.EmptySnapshot = void 0;
const Util_1 = require("./Util");
exports.EmptySnapshot = {
    data: undefined,
    clear: () => {
        // empty
    },
    loading: () => true,
    add: () => {
        // empty
    },
};
/**
 * Generic note store interface
 */
class NoteStore {
}
exports.NoteStore = NoteStore;
class HookedNoteStore {
    constructor() {
        _HookedNoteStore_instances.add(this);
        _HookedNoteStore_hooks.set(this, []);
        _HookedNoteStore_eventHooks.set(this, []);
        _HookedNoteStore_loading.set(this, true);
        _HookedNoteStore_storeSnapshot.set(this, {
            clear: () => this.clear(),
            loading: () => this.loading,
            add: ev => this.add(ev),
            data: undefined,
        });
        _HookedNoteStore_needsSnapshot.set(this, true);
        _HookedNoteStore_nextNotifyTimer.set(this, void 0);
    }
    get snapshot() {
        __classPrivateFieldGet(this, _HookedNoteStore_instances, "m", _HookedNoteStore_updateSnapshot).call(this);
        return __classPrivateFieldGet(this, _HookedNoteStore_storeSnapshot, "f");
    }
    get loading() {
        return __classPrivateFieldGet(this, _HookedNoteStore_loading, "f");
    }
    set loading(v) {
        __classPrivateFieldSet(this, _HookedNoteStore_loading, v, "f");
        this.onChange([]);
    }
    hook(cb) {
        __classPrivateFieldGet(this, _HookedNoteStore_hooks, "f").push(cb);
        return () => {
            const idx = __classPrivateFieldGet(this, _HookedNoteStore_hooks, "f").findIndex(a => a === cb);
            __classPrivateFieldGet(this, _HookedNoteStore_hooks, "f").splice(idx, 1);
        };
    }
    getSnapshotData() {
        __classPrivateFieldGet(this, _HookedNoteStore_instances, "m", _HookedNoteStore_updateSnapshot).call(this);
        return __classPrivateFieldGet(this, _HookedNoteStore_storeSnapshot, "f").data;
    }
    onEvent(cb) {
        const existing = __classPrivateFieldGet(this, _HookedNoteStore_eventHooks, "f").find(a => a === cb);
        if (!existing) {
            __classPrivateFieldGet(this, _HookedNoteStore_eventHooks, "f").push(cb);
            return () => {
                const idx = __classPrivateFieldGet(this, _HookedNoteStore_eventHooks, "f").findIndex(a => a === cb);
                __classPrivateFieldGet(this, _HookedNoteStore_eventHooks, "f").splice(idx, 1);
            };
        }
        return () => {
            //noop
        };
    }
    onChange(changes) {
        __classPrivateFieldSet(this, _HookedNoteStore_needsSnapshot, true, "f");
        if (!__classPrivateFieldGet(this, _HookedNoteStore_nextNotifyTimer, "f")) {
            __classPrivateFieldSet(this, _HookedNoteStore_nextNotifyTimer, setTimeout(() => {
                __classPrivateFieldSet(this, _HookedNoteStore_nextNotifyTimer, undefined, "f");
                for (const hk of __classPrivateFieldGet(this, _HookedNoteStore_hooks, "f")) {
                    hk();
                }
            }, 500), "f");
        }
        if (changes.length > 0) {
            for (const hkE of __classPrivateFieldGet(this, _HookedNoteStore_eventHooks, "f")) {
                hkE(changes);
            }
        }
    }
}
exports.HookedNoteStore = HookedNoteStore;
_HookedNoteStore_hooks = new WeakMap(), _HookedNoteStore_eventHooks = new WeakMap(), _HookedNoteStore_loading = new WeakMap(), _HookedNoteStore_storeSnapshot = new WeakMap(), _HookedNoteStore_needsSnapshot = new WeakMap(), _HookedNoteStore_nextNotifyTimer = new WeakMap(), _HookedNoteStore_instances = new WeakSet(), _HookedNoteStore_updateSnapshot = function _HookedNoteStore_updateSnapshot() {
    if (__classPrivateFieldGet(this, _HookedNoteStore_needsSnapshot, "f")) {
        __classPrivateFieldSet(this, _HookedNoteStore_storeSnapshot, {
            ...__classPrivateFieldGet(this, _HookedNoteStore_storeSnapshot, "f"),
            data: this.takeSnapshot(),
        }, "f");
        __classPrivateFieldSet(this, _HookedNoteStore_needsSnapshot, false, "f");
    }
};
/**
 * A simple flat container of events with no duplicates
 */
class FlatNoteStore extends HookedNoteStore {
    constructor() {
        super(...arguments);
        _FlatNoteStore_events.set(this, []);
        _FlatNoteStore_ids.set(this, new Set());
    }
    add(ev) {
        ev = Array.isArray(ev) ? ev : [ev];
        const changes = [];
        ev.forEach(a => {
            if (!__classPrivateFieldGet(this, _FlatNoteStore_ids, "f").has(a.id)) {
                __classPrivateFieldGet(this, _FlatNoteStore_events, "f").push(a);
                __classPrivateFieldGet(this, _FlatNoteStore_ids, "f").add(a.id);
                changes.push(a);
            }
            else {
                const existing = __classPrivateFieldGet(this, _FlatNoteStore_events, "f").find(b => b.id === a.id);
                if (existing) {
                    existing.relays = (0, Util_1.appendDedupe)(existing.relays, a.relays);
                }
            }
        });
        if (changes.length > 0) {
            this.onChange(changes);
        }
    }
    clear() {
        __classPrivateFieldSet(this, _FlatNoteStore_events, [], "f");
        __classPrivateFieldGet(this, _FlatNoteStore_ids, "f").clear();
        this.onChange([]);
    }
    takeSnapshot() {
        return [...__classPrivateFieldGet(this, _FlatNoteStore_events, "f")];
    }
}
exports.FlatNoteStore = FlatNoteStore;
_FlatNoteStore_events = new WeakMap(), _FlatNoteStore_ids = new WeakMap();
/**
 * A note store that holds a single replaceable event for a given user defined key generator function
 */
class KeyedReplaceableNoteStore extends HookedNoteStore {
    constructor(fn) {
        super();
        _KeyedReplaceableNoteStore_keyFn.set(this, void 0);
        _KeyedReplaceableNoteStore_events.set(this, new Map());
        __classPrivateFieldSet(this, _KeyedReplaceableNoteStore_keyFn, fn, "f");
    }
    add(ev) {
        ev = Array.isArray(ev) ? ev : [ev];
        const changes = [];
        ev.forEach(a => {
            const keyOnEvent = __classPrivateFieldGet(this, _KeyedReplaceableNoteStore_keyFn, "f").call(this, a);
            const existingCreated = __classPrivateFieldGet(this, _KeyedReplaceableNoteStore_events, "f").get(keyOnEvent)?.created_at ?? 0;
            if (a.created_at > existingCreated) {
                __classPrivateFieldGet(this, _KeyedReplaceableNoteStore_events, "f").set(keyOnEvent, a);
                changes.push(a);
            }
        });
        if (changes.length > 0) {
            this.onChange(changes);
        }
    }
    clear() {
        __classPrivateFieldGet(this, _KeyedReplaceableNoteStore_events, "f").clear();
        this.onChange([]);
    }
    takeSnapshot() {
        return [...__classPrivateFieldGet(this, _KeyedReplaceableNoteStore_events, "f").values()];
    }
}
exports.KeyedReplaceableNoteStore = KeyedReplaceableNoteStore;
_KeyedReplaceableNoteStore_keyFn = new WeakMap(), _KeyedReplaceableNoteStore_events = new WeakMap();
/**
 * A note store that holds a single replaceable event
 */
class ReplaceableNoteStore extends HookedNoteStore {
    constructor() {
        super(...arguments);
        _ReplaceableNoteStore_event.set(this, void 0);
    }
    add(ev) {
        ev = Array.isArray(ev) ? ev : [ev];
        const changes = [];
        ev.forEach(a => {
            const existingCreated = __classPrivateFieldGet(this, _ReplaceableNoteStore_event, "f")?.created_at ?? 0;
            if (a.created_at > existingCreated) {
                __classPrivateFieldSet(this, _ReplaceableNoteStore_event, a, "f");
                changes.push(a);
            }
        });
        if (changes.length > 0) {
            this.onChange(changes);
        }
    }
    clear() {
        __classPrivateFieldSet(this, _ReplaceableNoteStore_event, undefined, "f");
        this.onChange([]);
    }
    takeSnapshot() {
        if (__classPrivateFieldGet(this, _ReplaceableNoteStore_event, "f")) {
            return Object.freeze({ ...__classPrivateFieldGet(this, _ReplaceableNoteStore_event, "f") });
        }
    }
}
exports.ReplaceableNoteStore = ReplaceableNoteStore;
_ReplaceableNoteStore_event = new WeakMap();
/**
 * A note store that holds a single replaceable event per pubkey
 */
class PubkeyReplaceableNoteStore extends KeyedReplaceableNoteStore {
    constructor() {
        super(e => e.pubkey);
    }
}
exports.PubkeyReplaceableNoteStore = PubkeyReplaceableNoteStore;
/**
 * A note store that holds a single replaceable event per "pubkey-dtag"
 */
class ParameterizedReplaceableNoteStore extends KeyedReplaceableNoteStore {
    constructor() {
        super(ev => {
            const dTag = (0, Util_1.findTag)(ev, "d");
            return `${ev.pubkey}-${dTag}`;
        });
    }
}
exports.ParameterizedReplaceableNoteStore = ParameterizedReplaceableNoteStore;
//# sourceMappingURL=NoteCollection.js.map