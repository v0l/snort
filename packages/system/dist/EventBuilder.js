"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EventBuilder_instances, _EventBuilder_kind, _EventBuilder_content, _EventBuilder_createdAt, _EventBuilder_pubkey, _EventBuilder_tags, _EventBuilder_validate, _EventBuilder_replaceMention, _EventBuilder_addHashtag;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBuilder = void 0;
const _1 = require(".");
const Const_1 = require("./Const");
const Util_1 = require("./Util");
const EventExt_1 = require("./EventExt");
const NostrLink_1 = require("./NostrLink");
class EventBuilder {
    constructor() {
        _EventBuilder_instances.add(this);
        _EventBuilder_kind.set(this, void 0);
        _EventBuilder_content.set(this, void 0);
        _EventBuilder_createdAt.set(this, void 0);
        _EventBuilder_pubkey.set(this, void 0);
        _EventBuilder_tags.set(this, []);
    }
    kind(k) {
        __classPrivateFieldSet(this, _EventBuilder_kind, k, "f");
        return this;
    }
    content(c) {
        __classPrivateFieldSet(this, _EventBuilder_content, c, "f");
        return this;
    }
    createdAt(n) {
        __classPrivateFieldSet(this, _EventBuilder_createdAt, n, "f");
        return this;
    }
    pubKey(k) {
        __classPrivateFieldSet(this, _EventBuilder_pubkey, k, "f");
        return this;
    }
    tag(t) {
        const duplicate = __classPrivateFieldGet(this, _EventBuilder_tags, "f").some(a => a.length === t.length && a.every((b, i) => b !== a[i]));
        if (duplicate)
            return this;
        __classPrivateFieldGet(this, _EventBuilder_tags, "f").push(t);
        return this;
    }
    /**
     * Extract mentions
     */
    processContent() {
        if (__classPrivateFieldGet(this, _EventBuilder_content, "f")) {
            __classPrivateFieldSet(this, _EventBuilder_content, __classPrivateFieldGet(this, _EventBuilder_content, "f").replace(/@n(pub|profile|event|ote|addr|)1[acdefghjklmnpqrstuvwxyz023456789]+/g, m => __classPrivateFieldGet(this, _EventBuilder_instances, "m", _EventBuilder_replaceMention).call(this, m)), "f");
            const hashTags = [...__classPrivateFieldGet(this, _EventBuilder_content, "f").matchAll(Const_1.HashtagRegex)];
            hashTags.map(hashTag => {
                __classPrivateFieldGet(this, _EventBuilder_instances, "m", _EventBuilder_addHashtag).call(this, hashTag[0]);
            });
        }
        return this;
    }
    build() {
        __classPrivateFieldGet(this, _EventBuilder_instances, "m", _EventBuilder_validate).call(this);
        const ev = {
            id: "",
            pubkey: __classPrivateFieldGet(this, _EventBuilder_pubkey, "f") ?? "",
            content: __classPrivateFieldGet(this, _EventBuilder_content, "f") ?? "",
            kind: __classPrivateFieldGet(this, _EventBuilder_kind, "f"),
            created_at: __classPrivateFieldGet(this, _EventBuilder_createdAt, "f") ?? (0, Util_1.unixNow)(),
            tags: __classPrivateFieldGet(this, _EventBuilder_tags, "f"),
        };
        ev.id = EventExt_1.EventExt.createId(ev);
        return ev;
    }
    /**
     * Build and sign event
     * @param pk Private key to sign event with
     */
    async buildAndSign(pk) {
        const ev = this.pubKey((0, Util_1.getPublicKey)(pk)).build();
        await EventExt_1.EventExt.sign(ev, pk);
        return ev;
    }
}
exports.EventBuilder = EventBuilder;
_EventBuilder_kind = new WeakMap(), _EventBuilder_content = new WeakMap(), _EventBuilder_createdAt = new WeakMap(), _EventBuilder_pubkey = new WeakMap(), _EventBuilder_tags = new WeakMap(), _EventBuilder_instances = new WeakSet(), _EventBuilder_validate = function _EventBuilder_validate() {
    if (__classPrivateFieldGet(this, _EventBuilder_kind, "f") === undefined) {
        throw new Error("Kind must be set");
    }
    if (__classPrivateFieldGet(this, _EventBuilder_pubkey, "f") === undefined) {
        throw new Error("Pubkey must be set");
    }
}, _EventBuilder_replaceMention = function _EventBuilder_replaceMention(match) {
    const npub = match.slice(1);
    const link = (0, NostrLink_1.parseNostrLink)(npub);
    if (link) {
        if (link.type === _1.NostrPrefix.Profile || link.type === _1.NostrPrefix.PublicKey) {
            this.tag(["p", link.id]);
        }
        return `nostr:${link.encode()}`;
    }
    else {
        return match;
    }
}, _EventBuilder_addHashtag = function _EventBuilder_addHashtag(match) {
    const tag = match.slice(1);
    this.tag(["t", tag.toLowerCase()]);
};
//# sourceMappingURL=EventBuilder.js.map