import * as secp from "@noble/secp256k1";
import { bech32 } from "bech32";

export async function openFile() {
    return new Promise((resolve, reject) => {
        let elm = document.createElement("input");
        elm.type = "file";
        elm.onchange = (e) => {
            resolve(e.target.files[0]);
        };
        elm.click();
    });
}

/**
 * Parse bech32 ids
 * https://github.com/nostr-protocol/nips/blob/master/19.md
 * @param {string} id bech32 id
 */
export function parseId(id) {
    const hrp = ["note", "npub", "nsec"];
    try {
        if (hrp.some(a => id.startsWith(a))) {
            return bech32ToHex(id);
        }
    } catch (e) { }
    return id;
}

export function bech32ToHex(str) {
    let nKey = bech32.decode(str);
    let buff = bech32.fromWords(nKey.words);
    return secp.utils.bytesToHex(Uint8Array.from(buff));
}

/**
 * Decode bech32 to string UTF-8
 * @param {string} str bech32 encoded string
 * @returns 
 */
export function bech32ToText(str) {
    let decoded = bech32.decode(str, 1000);
    let buf = bech32.fromWords(decoded.words);
    return new TextDecoder().decode(Uint8Array.from(buf));
}

/**
 * Convert hex note id to bech32 link url
 * @param {string} hex 
 * @returns 
 */
export function eventLink(hex) {
    return `/e/${hexToBech32("note", hex)}`;
}

/**
 * Convert hex to bech32
 * @param {string} hex
 */
export function hexToBech32(hrp, hex) {
    if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 != 0) {
        return "";
    }

    try {
        let buf = secp.utils.hexToBytes(hex);
        return bech32.encode(hrp, bech32.toWords(buf));
    } catch (e) {
        console.warn("Invalid hex", hex, e);
        return "";
    }
}

/**
 * Convert hex pubkey to bech32 link url
 * @param {string} hex 
 * @returns 
 */
export function profileLink(hex) {
    return `/p/${hexToBech32("npub", hex)}`;
}

/**
 * Reaction types
 */
export const Reaction = {
    Positive: "+",
    Negative: "-"
};

/**
 * Return normalized reaction content
 * @param {string} content 
 * @returns 
 */
export function normalizeReaction(content) {
    switch (content) {
        case "": return Reaction.Positive;
        case "🤙": return Reaction.Positive;
        case "❤️": return Reaction.Positive;
        case "👍": return Reaction.Positive;
        case "💯": return Reaction.Positive;
        case "+": return Reaction.Positive;
        case "-": return Reaction.Negative;
        case "👎": return Reaction.Negative;
    }
    return content;
}

/**
 * Converts LNURL service to LN Address
 * @param {string} lnurl 
 * @returns 
 */
export function extractLnAddress(lnurl) {
    // some clients incorrectly set this to LNURL service, patch this
    if (lnurl.toLowerCase().startsWith("lnurl")) {
        let url = bech32ToText(lnurl);
        if (url.startsWith("http")) {
            let parsedUri = new URL(url);
            // is lightning address
            if (parsedUri.pathname.startsWith("/.well-known/lnurlp/")) {
                let pathParts = parsedUri.pathname.split('/');
                let username = pathParts[pathParts.length - 1];
                return `${username}@${parsedUri.hostname}`;
            }
        }
    }
    return lnurl;
}
