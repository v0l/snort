"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var _EventPublisher_instances, _EventPublisher_system, _EventPublisher_pubKey, _EventPublisher_privateKey, _EventPublisher_hasNip07_get, _EventPublisher_eb, _EventPublisher_sign;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisher = void 0;
const secp = __importStar(require("@noble/curves/secp256k1"));
const utils = __importStar(require("@noble/curves/abstract/utils"));
const _1 = require(".");
const Util_1 = require("./Util");
const EventBuilder_1 = require("./EventBuilder");
const EventExt_1 = require("./EventExt");
const WorkQueue_1 = require("./WorkQueue");
const Nip7Queue = [];
(0, WorkQueue_1.processWorkQueue)(Nip7Queue);
class EventPublisher {
    constructor(system, pubKey, privKey) {
        _EventPublisher_instances.add(this);
        _EventPublisher_system.set(this, void 0);
        _EventPublisher_pubKey.set(this, void 0);
        _EventPublisher_privateKey.set(this, void 0);
        __classPrivateFieldSet(this, _EventPublisher_system, system, "f");
        if (privKey) {
            __classPrivateFieldSet(this, _EventPublisher_privateKey, privKey, "f");
            __classPrivateFieldSet(this, _EventPublisher_pubKey, utils.bytesToHex(secp.schnorr.getPublicKey(privKey)), "f");
        }
        else {
            __classPrivateFieldSet(this, _EventPublisher_pubKey, pubKey, "f");
        }
    }
    async nip4Encrypt(content, key) {
        if (__classPrivateFieldGet(this, _EventPublisher_instances, "a", _EventPublisher_hasNip07_get) && !__classPrivateFieldGet(this, _EventPublisher_privateKey, "f")) {
            const nip7PubKey = await (0, WorkQueue_1.barrierQueue)(Nip7Queue, () => (0, Util_1.unwrap)(window.nostr).getPublicKey());
            if (nip7PubKey !== __classPrivateFieldGet(this, _EventPublisher_pubKey, "f")) {
                throw new Error("Can't encrypt content, NIP-07 pubkey does not match");
            }
            return await (0, WorkQueue_1.barrierQueue)(Nip7Queue, () => (0, Util_1.unwrap)(window.nostr?.nip04?.encrypt).call(window.nostr?.nip04, key, content));
        }
        else if (__classPrivateFieldGet(this, _EventPublisher_privateKey, "f")) {
            return await EventExt_1.EventExt.encryptData(content, key, __classPrivateFieldGet(this, _EventPublisher_privateKey, "f"));
        }
        else {
            throw new Error("Can't encrypt content, no private keys available");
        }
    }
    async nip4Decrypt(content, otherKey) {
        if (__classPrivateFieldGet(this, _EventPublisher_instances, "a", _EventPublisher_hasNip07_get) && !__classPrivateFieldGet(this, _EventPublisher_privateKey, "f") && window.nostr?.nip04?.decrypt) {
            return await (0, WorkQueue_1.barrierQueue)(Nip7Queue, () => (0, Util_1.unwrap)(window.nostr?.nip04?.decrypt).call(window.nostr?.nip04, otherKey, content));
        }
        else if (__classPrivateFieldGet(this, _EventPublisher_privateKey, "f")) {
            return await EventExt_1.EventExt.decryptDm(content, __classPrivateFieldGet(this, _EventPublisher_privateKey, "f"), otherKey);
        }
        else {
            throw new Error("Can't decrypt content, no private keys available");
        }
    }
    async nip42Auth(challenge, relay) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.Auth);
        eb.tag(["relay", relay]);
        eb.tag(["challenge", challenge]);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    broadcast(ev) {
        console.debug(ev);
        __classPrivateFieldGet(this, _EventPublisher_system, "f").BroadcastEvent(ev);
    }
    /**
     * Write event to all given relays.
     */
    broadcastAll(ev, relays) {
        for (const k of relays) {
            __classPrivateFieldGet(this, _EventPublisher_system, "f").WriteOnceToRelay(k, ev);
        }
    }
    async muted(keys, priv) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.PubkeyLists);
        eb.tag(["d", _1.Lists.Muted]);
        keys.forEach(p => {
            eb.tag(["p", p]);
        });
        if (priv.length > 0) {
            const ps = priv.map(p => ["p", p]);
            const plaintext = JSON.stringify(ps);
            eb.content(await this.nip4Encrypt(plaintext, __classPrivateFieldGet(this, _EventPublisher_pubKey, "f")));
        }
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async noteList(notes, list) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.NoteLists);
        eb.tag(["d", list]);
        notes.forEach(n => {
            eb.tag(["e", n]);
        });
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async tags(tags) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.TagLists);
        eb.tag(["d", _1.Lists.Followed]);
        tags.forEach(t => {
            eb.tag(["t", t]);
        });
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async metadata(obj) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.SetMetadata);
        eb.content(JSON.stringify(obj));
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    /**
     * Create a basic text note
     */
    async note(msg, fnExtra) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.TextNote);
        eb.content(msg);
        eb.processContent();
        fnExtra?.(eb);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    /**
     * Create a zap request event for a given target event/profile
     * @param amount Millisats amout!
     * @param author Author pubkey to tag in the zap
     * @param note Note Id to tag in the zap
     * @param msg Custom message to be included in the zap
     */
    async zap(amount, author, relays, note, msg, fnExtra) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.ZapRequest);
        eb.content(msg ?? "");
        if (note) {
            eb.tag(["e", note]);
        }
        eb.tag(["p", author]);
        eb.tag(["relays", ...relays.map(a => a.trim())]);
        eb.tag(["amount", amount.toString()]);
        eb.processContent();
        fnExtra?.(eb);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    /**
     * Reply to a note
     */
    async reply(replyTo, msg, fnExtra) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.TextNote);
        eb.content(msg);
        const thread = EventExt_1.EventExt.extractThread(replyTo);
        if (thread) {
            if (thread.root || thread.replyTo) {
                eb.tag(["e", thread.root?.Event ?? thread.replyTo?.Event ?? "", "", "root"]);
            }
            eb.tag(["e", replyTo.id, replyTo.relays?.[0] ?? "", "reply"]);
            eb.tag(["p", replyTo.pubkey]);
            for (const pk of thread.pubKeys) {
                if (pk === __classPrivateFieldGet(this, _EventPublisher_pubKey, "f")) {
                    continue;
                }
                eb.tag(["p", pk]);
            }
        }
        else {
            eb.tag(["e", replyTo.id, "", "reply"]);
            // dont tag self in replies
            if (replyTo.pubkey !== __classPrivateFieldGet(this, _EventPublisher_pubKey, "f")) {
                eb.tag(["p", replyTo.pubkey]);
            }
        }
        eb.processContent();
        fnExtra?.(eb);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async react(evRef, content = "+") {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.Reaction);
        eb.content(content);
        eb.tag(["e", evRef.id]);
        eb.tag(["p", evRef.pubkey]);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async relayList(relays) {
        if (!Array.isArray(relays)) {
            relays = Object.entries(relays).map(([k, v]) => ({
                url: k,
                settings: v,
            }));
        }
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.Relays);
        for (const rx of relays) {
            const rTag = ["r", rx.url];
            if (rx.settings.read && !rx.settings.write) {
                rTag.push("read");
            }
            if (rx.settings.write && !rx.settings.read) {
                rTag.push("write");
            }
            eb.tag(rTag);
        }
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async contactList(follows, relays) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.ContactList);
        eb.content(JSON.stringify(relays));
        const temp = new Set(follows.filter(a => a.length === 64).map(a => a.toLowerCase()));
        temp.forEach(a => eb.tag(["p", a]));
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    /**
     * Delete an event (NIP-09)
     */
    async delete(id) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.Deletion);
        eb.tag(["e", id]);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    /**
     * Repost a note (NIP-18)
     */
    async repost(note) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.Repost);
        eb.tag(["e", note.id, ""]);
        eb.tag(["p", note.pubkey]);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async decryptDm(note) {
        if (note.pubkey !== __classPrivateFieldGet(this, _EventPublisher_pubKey, "f") && !note.tags.some(a => a[1] === __classPrivateFieldGet(this, _EventPublisher_pubKey, "f"))) {
            throw new Error("Can't decrypt, DM does not belong to this user");
        }
        const otherPubKey = note.pubkey === __classPrivateFieldGet(this, _EventPublisher_pubKey, "f") ? (0, Util_1.unwrap)(note.tags.find(a => a[0] === "p")?.[1]) : note.pubkey;
        return await this.nip4Decrypt(note.content, otherPubKey);
    }
    async sendDm(content, to) {
        const eb = __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_eb).call(this, _1.EventKind.DirectMessage);
        eb.content(await this.nip4Encrypt(content, to));
        eb.tag(["p", to]);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
    async generic(fnHook) {
        const eb = new EventBuilder_1.EventBuilder();
        eb.pubKey(__classPrivateFieldGet(this, _EventPublisher_pubKey, "f"));
        fnHook(eb);
        return await __classPrivateFieldGet(this, _EventPublisher_instances, "m", _EventPublisher_sign).call(this, eb);
    }
}
exports.EventPublisher = EventPublisher;
_EventPublisher_system = new WeakMap(), _EventPublisher_pubKey = new WeakMap(), _EventPublisher_privateKey = new WeakMap(), _EventPublisher_instances = new WeakSet(), _EventPublisher_hasNip07_get = function _EventPublisher_hasNip07_get() {
    return "nostr" in window;
}, _EventPublisher_eb = function _EventPublisher_eb(k) {
    const eb = new EventBuilder_1.EventBuilder();
    return eb.pubKey(__classPrivateFieldGet(this, _EventPublisher_pubKey, "f")).kind(k);
}, _EventPublisher_sign = async function _EventPublisher_sign(eb) {
    if (__classPrivateFieldGet(this, _EventPublisher_instances, "a", _EventPublisher_hasNip07_get) && !__classPrivateFieldGet(this, _EventPublisher_privateKey, "f")) {
        const nip7PubKey = await (0, WorkQueue_1.barrierQueue)(Nip7Queue, () => (0, Util_1.unwrap)(window.nostr).getPublicKey());
        if (nip7PubKey !== __classPrivateFieldGet(this, _EventPublisher_pubKey, "f")) {
            throw new Error("Can't sign event, NIP-07 pubkey does not match");
        }
        const ev = eb.build();
        return await (0, WorkQueue_1.barrierQueue)(Nip7Queue, () => (0, Util_1.unwrap)(window.nostr).signEvent(ev));
    }
    else if (__classPrivateFieldGet(this, _EventPublisher_privateKey, "f")) {
        return await eb.buildAndSign(__classPrivateFieldGet(this, _EventPublisher_privateKey, "f"));
    }
    else {
        throw new Error("Can't sign event, no private keys available");
    }
};
//# sourceMappingURL=EventPublisher.js.map