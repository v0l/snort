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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _EventExt_getDmSharedKey;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventExt = void 0;
const secp = __importStar(require("@noble/curves/secp256k1"));
const utils = __importStar(require("@noble/curves/abstract/utils"));
const _1 = require(".");
const base64_1 = __importDefault(require("@protobufjs/base64"));
const Util_1 = require("./Util");
class EventExt {
    /**
     * Get the pub key of the creator of this event NIP-26
     */
    static getRootPubKey(e) {
        const delegation = e.tags.find(a => a[0] === "delegation");
        if (delegation?.[1]) {
            // todo: verify sig
            return delegation[1];
        }
        return e.pubkey;
    }
    /**
     * Sign this message with a private key
     */
    static sign(e, key) {
        e.id = this.createId(e);
        const sig = secp.schnorr.sign(e.id, key);
        e.sig = utils.bytesToHex(sig);
        if (!(secp.schnorr.verify(e.sig, e.id, e.pubkey))) {
            throw new Error("Signing failed");
        }
    }
    /**
     * Check the signature of this message
     * @returns True if valid signature
     */
    static verify(e) {
        const id = this.createId(e);
        const result = secp.schnorr.verify(e.sig, id, e.pubkey);
        return result;
    }
    static createId(e) {
        const payload = [0, e.pubkey, e.created_at, e.kind, e.tags, e.content];
        const hash = (0, Util_1.sha256)(JSON.stringify(payload));
        if (e.id !== "" && hash !== e.id) {
            console.debug(payload);
            throw new Error("ID doesnt match!");
        }
        return hash;
    }
    /**
     * Create a new event for a specific pubkey
     */
    static forPubKey(pk, kind) {
        return {
            pubkey: pk,
            kind: kind,
            created_at: (0, Util_1.unixNow)(),
            content: "",
            tags: [],
            id: "",
            sig: "",
        };
    }
    static extractThread(ev) {
        const isThread = ev.tags.some(a => (a[0] === "e" && a[3] !== "mention") || a[0] == "a");
        if (!isThread) {
            return undefined;
        }
        const shouldWriteMarkers = ev.kind === _1.EventKind.TextNote;
        const ret = {
            mentions: [],
            pubKeys: [],
        };
        const eTags = ev.tags.filter(a => a[0] === "e" || a[0] === "a").map((v, i) => new _1.Tag(v, i));
        const marked = eTags.some(a => a.Marker !== undefined);
        if (!marked) {
            ret.root = eTags[0];
            ret.root.Marker = shouldWriteMarkers ? "root" : undefined;
            if (eTags.length > 1) {
                ret.replyTo = eTags[1];
                ret.replyTo.Marker = shouldWriteMarkers ? "reply" : undefined;
            }
            if (eTags.length > 2) {
                ret.mentions = eTags.slice(2);
                if (shouldWriteMarkers) {
                    ret.mentions.forEach(a => (a.Marker = "mention"));
                }
            }
        }
        else {
            const root = eTags.find(a => a.Marker === "root");
            const reply = eTags.find(a => a.Marker === "reply");
            ret.root = root;
            ret.replyTo = reply;
            ret.mentions = eTags.filter(a => a.Marker === "mention");
        }
        ret.pubKeys = Array.from(new Set(ev.tags.filter(a => a[0] === "p").map(a => a[1])));
        return ret;
    }
    /**
     * Encrypt the given message content
     */
    static async encryptData(content, pubkey, privkey) {
        const key = await __classPrivateFieldGet(this, _a, "m", _EventExt_getDmSharedKey).call(this, pubkey, privkey);
        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        const data = new TextEncoder().encode(content);
        const result = await window.crypto.subtle.encrypt({
            name: "AES-CBC",
            iv: iv,
        }, key, data);
        const uData = new Uint8Array(result);
        return `${base64_1.default.encode(uData, 0, result.byteLength)}?iv=${base64_1.default.encode(iv, 0, 16)}`;
    }
    /**
     * Decrypt the content of the message
     */
    static async decryptData(cyphertext, privkey, pubkey) {
        const key = await __classPrivateFieldGet(this, _a, "m", _EventExt_getDmSharedKey).call(this, pubkey, privkey);
        const cSplit = cyphertext.split("?iv=");
        const data = new Uint8Array(base64_1.default.length(cSplit[0]));
        base64_1.default.decode(cSplit[0], data, 0);
        const iv = new Uint8Array(base64_1.default.length(cSplit[1]));
        base64_1.default.decode(cSplit[1], iv, 0);
        const result = await window.crypto.subtle.decrypt({
            name: "AES-CBC",
            iv: iv,
        }, key, data);
        return new TextDecoder().decode(result);
    }
    /**
     * Decrypt the content of this message in place
     */
    static async decryptDm(content, privkey, pubkey) {
        return await this.decryptData(content, privkey, pubkey);
    }
}
exports.EventExt = EventExt;
_a = EventExt, _EventExt_getDmSharedKey = async function _EventExt_getDmSharedKey(pubkey, privkey) {
    const sharedPoint = secp.secp256k1.getSharedSecret(privkey, "02" + pubkey);
    const sharedX = sharedPoint.slice(1, 33);
    return await window.crypto.subtle.importKey("raw", sharedX, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
};
//# sourceMappingURL=EventExt.js.map