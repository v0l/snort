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
var _ExternalStore_hooks, _ExternalStore_snapshot, _ExternalStore_changed;
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Simple React hookable store with manual change notifications
 */
class ExternalStore {
    constructor() {
        _ExternalStore_hooks.set(this, []);
        _ExternalStore_snapshot.set(this, {});
        _ExternalStore_changed.set(this, true);
    }
    hook(fn) {
        __classPrivateFieldGet(this, _ExternalStore_hooks, "f").push({
            fn,
        });
        return () => {
            const idx = __classPrivateFieldGet(this, _ExternalStore_hooks, "f").findIndex(a => a.fn === fn);
            if (idx >= 0) {
                __classPrivateFieldGet(this, _ExternalStore_hooks, "f").splice(idx, 1);
            }
        };
    }
    snapshot() {
        if (__classPrivateFieldGet(this, _ExternalStore_changed, "f")) {
            __classPrivateFieldSet(this, _ExternalStore_snapshot, this.takeSnapshot(), "f");
            __classPrivateFieldSet(this, _ExternalStore_changed, false, "f");
        }
        return __classPrivateFieldGet(this, _ExternalStore_snapshot, "f");
    }
    notifyChange(sn) {
        __classPrivateFieldSet(this, _ExternalStore_changed, true, "f");
        __classPrivateFieldGet(this, _ExternalStore_hooks, "f").forEach(h => h.fn(sn));
    }
}
exports.default = ExternalStore;
_ExternalStore_hooks = new WeakMap(), _ExternalStore_snapshot = new WeakMap(), _ExternalStore_changed = new WeakMap();
//# sourceMappingURL=ExternalStore.js.map