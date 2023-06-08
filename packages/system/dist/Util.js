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
exports.bech32ToHex = exports.getPublicKey = exports.sha256 = exports.findTag = exports.appendDedupe = exports.dedupe = exports.distance = exports.deepEqual = exports.unixNowMs = exports.unixNow = exports.sanitizeRelayUrl = exports.hexToBech32 = exports.unwrap = void 0;
const utils = __importStar(require("@noble/curves/abstract/utils"));
const secp = __importStar(require("@noble/curves/secp256k1"));
const sha256_1 = require("@noble/hashes/sha256");
const bech32_1 = require("bech32");
function unwrap(v) {
    if (v === undefined || v === null) {
        throw new Error("missing value");
    }
    return v;
}
exports.unwrap = unwrap;
/**
 * Convert hex to bech32
 */
function hexToBech32(hrp, hex) {
    if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) {
        return "";
    }
    try {
        const buf = utils.hexToBytes(hex);
        return bech32_1.bech32.encode(hrp, bech32_1.bech32.toWords(buf));
    }
    catch (e) {
        console.warn("Invalid hex", hex, e);
        return "";
    }
}
exports.hexToBech32 = hexToBech32;
function sanitizeRelayUrl(url) {
    try {
        return new URL(url).toString();
    }
    catch {
        // ignore
    }
}
exports.sanitizeRelayUrl = sanitizeRelayUrl;
function unixNow() {
    return Math.floor(unixNowMs() / 1000);
}
exports.unixNow = unixNow;
function unixNowMs() {
    return new Date().getTime();
}
exports.unixNowMs = unixNowMs;
function deepEqual(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === "object" && tx === ty
        ? ok(x).length === ok(y).length && ok(x).every(key => deepEqual(x[key], y[key]))
        : x === y;
}
exports.deepEqual = deepEqual;
/**
 * Compute the "distance" between two objects by comparing their difference in properties
 * Missing/Added keys result in +10 distance
 * This is not recursive
 */
function distance(a, b) {
    const keys1 = Object.keys(a);
    const keys2 = Object.keys(b);
    const maxKeys = keys1.length > keys2.length ? keys1 : keys2;
    let distance = 0;
    for (const key of maxKeys) {
        if (key in a && key in b) {
            if (Array.isArray(a[key]) && Array.isArray(b[key])) {
                const aa = a[key];
                const bb = b[key];
                if (aa.length === bb.length) {
                    if (aa.some(v => !bb.includes(v))) {
                        distance++;
                    }
                }
                else {
                    distance++;
                }
            }
            else if (a[key] !== b[key]) {
                distance++;
            }
        }
        else {
            distance += 10;
        }
    }
    return distance;
}
exports.distance = distance;
function dedupe(v) {
    return [...new Set(v)];
}
exports.dedupe = dedupe;
function appendDedupe(a, b) {
    return dedupe([...(a ?? []), ...(b ?? [])]);
}
exports.appendDedupe = appendDedupe;
function findTag(e, tag) {
    const maybeTag = e.tags.find(evTag => {
        return evTag[0] === tag;
    });
    return maybeTag && maybeTag[1];
}
exports.findTag = findTag;
const sha256 = (str) => {
    return utils.bytesToHex((0, sha256_1.sha256)(str));
};
exports.sha256 = sha256;
function getPublicKey(privKey) {
    return utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
}
exports.getPublicKey = getPublicKey;
function bech32ToHex(str) {
    try {
        const nKey = bech32_1.bech32.decode(str, 1000);
        const buff = bech32_1.bech32.fromWords(nKey.words);
        return utils.bytesToHex(Uint8Array.from(buff));
    }
    catch (e) {
        return str;
    }
}
exports.bech32ToHex = bech32ToHex;
//# sourceMappingURL=Util.js.map