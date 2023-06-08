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
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeTLV = exports.encodeTLV = exports.TLVEntryType = exports.NostrPrefix = void 0;
const utils = __importStar(require("@noble/curves/abstract/utils"));
const bech32_1 = require("bech32");
var NostrPrefix;
(function (NostrPrefix) {
    NostrPrefix["PublicKey"] = "npub";
    NostrPrefix["PrivateKey"] = "nsec";
    NostrPrefix["Note"] = "note";
    // TLV prefixes
    NostrPrefix["Profile"] = "nprofile";
    NostrPrefix["Event"] = "nevent";
    NostrPrefix["Relay"] = "nrelay";
    NostrPrefix["Address"] = "naddr";
})(NostrPrefix = exports.NostrPrefix || (exports.NostrPrefix = {}));
var TLVEntryType;
(function (TLVEntryType) {
    TLVEntryType[TLVEntryType["Special"] = 0] = "Special";
    TLVEntryType[TLVEntryType["Relay"] = 1] = "Relay";
    TLVEntryType[TLVEntryType["Author"] = 2] = "Author";
    TLVEntryType[TLVEntryType["Kind"] = 3] = "Kind";
})(TLVEntryType = exports.TLVEntryType || (exports.TLVEntryType = {}));
function encodeTLV(prefix, id, relays, kind, author) {
    const enc = new TextEncoder();
    const buf = prefix === NostrPrefix.Address ? enc.encode(id) : utils.hexToBytes(id);
    const tl0 = [0, buf.length, ...buf];
    const tl1 = relays
        ?.map(a => {
        const data = enc.encode(a);
        return [1, data.length, ...data];
    })
        .flat() ?? [];
    const tl2 = author ? [2, 32, ...utils.hexToBytes(author)] : [];
    const tl3 = kind ? [3, 4, ...new Uint8Array(new Uint32Array([kind]).buffer).reverse()] : [];
    return bech32_1.bech32.encode(prefix, bech32_1.bech32.toWords([...tl0, ...tl1, ...tl2, ...tl3]), 1000);
}
exports.encodeTLV = encodeTLV;
function decodeTLV(str) {
    const decoded = bech32_1.bech32.decode(str, 1000);
    const data = bech32_1.bech32.fromWords(decoded.words);
    const entries = [];
    let x = 0;
    while (x < data.length) {
        const t = data[x];
        const l = data[x + 1];
        const v = data.slice(x + 2, x + 2 + l);
        entries.push({
            type: t,
            length: l,
            value: decodeTLVEntry(t, decoded.prefix, new Uint8Array(v)),
        });
        x += 2 + l;
    }
    return entries;
}
exports.decodeTLV = decodeTLV;
function decodeTLVEntry(type, prefix, data) {
    switch (type) {
        case TLVEntryType.Special: {
            if (prefix === NostrPrefix.Address) {
                return new TextDecoder("ASCII").decode(data);
            }
            else {
                return utils.bytesToHex(data);
            }
        }
        case TLVEntryType.Author: {
            return utils.bytesToHex(data);
        }
        case TLVEntryType.Kind: {
            return new Uint32Array(new Uint8Array(data.reverse()).buffer)[0];
        }
        case TLVEntryType.Relay: {
            return new TextDecoder("ASCII").decode(data);
        }
    }
}
//# sourceMappingURL=Links.js.map