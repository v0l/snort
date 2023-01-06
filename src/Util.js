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
 * @param {string} id bech32 id
 */
export function parseId(id) {
    const hrp = ["note1", "npub", "nsec"];
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
 * Convert hex note id to bech32 link url
 * @param {string} hex 
 * @returns 
 */
export function eventLink(hex) {
    let buf = secp.utils.hexToBytes(hex);
    return `/e/${bech32.encode("note1", bech32.toWords(buf))}`;
}

/**
 * Convert hex pubkey to bech32 link url
 * @param {string} hex 
 * @returns 
 */
export function profileLink(hex) {
    let buf = secp.utils.hexToBytes(hex);
    return `/p/${bech32.encode("npub", bech32.toWords(buf))}`;
}