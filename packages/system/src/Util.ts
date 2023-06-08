import * as utils from "@noble/curves/abstract/utils";
import * as secp from "@noble/curves/secp256k1";
import { sha256 as sha2 } from "@noble/hashes/sha256";
import { bech32 } from "bech32";
import { NostrEvent, u256 } from "./Nostr";
import { FlatReqFilter } from "RequestExpander";

export function unwrap<T>(v: T | undefined | null): T {
  if (v === undefined || v === null) {
    throw new Error("missing value");
  }
  return v;
}

/**
 * Convert hex to bech32
 */
export function hexToBech32(hrp: string, hex?: string) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) {
    return "";
  }

  try {
    const buf = utils.hexToBytes(hex);
    return bech32.encode(hrp, bech32.toWords(buf));
  } catch (e) {
    console.warn("Invalid hex", hex, e);
    return "";
  }
}

export function sanitizeRelayUrl(url: string) {
  try {
    return new URL(url).toString();
  } catch {
    // ignore
  }
}

export function unixNow() {
  return Math.floor(unixNowMs() / 1000);
}

export function unixNowMs() {
  return new Date().getTime();
}

export function deepEqual(x: any, y: any): boolean {
  const ok = Object.keys,
    tx = typeof x,
    ty = typeof y;

  return x && y && tx === "object" && tx === ty
    ? ok(x).length === ok(y).length && ok(x).every(key => deepEqual(x[key], y[key]))
    : x === y;
}

export function flatReqFilterEq(a: FlatReqFilter, b: FlatReqFilter): boolean {
  return a.ids === b.ids
    && a.kinds === b.kinds
    && a.authors === b.authors
    && a.limit === b.limit
    && a.since === b.since
    && a.until === b.until
    && a.search === b.search
    && a["#e"] === b["#e"]
    && a["#p"] === b["#p"]
    && a["#t"] === b["#t"]
    && a["#d"] === b["#d"]
    && a["#r"] === b["#r"];
}

export function dedupe<T>(v: Array<T>) {
  return [...new Set(v)];
}

export function appendDedupe<T>(a?: Array<T>, b?: Array<T>) {
  return dedupe([...(a ?? []), ...(b ?? [])]);
}

export function findTag(e: NostrEvent, tag: string) {
  const maybeTag = e.tags.find(evTag => {
    return evTag[0] === tag;
  });
  return maybeTag && maybeTag[1];
}

export const sha256 = (str: string | Uint8Array): u256 => {
  return utils.bytesToHex(sha2(str));
}

export function getPublicKey(privKey: string) {
  return utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
}

export function bech32ToHex(str: string) {
  try {
    const nKey = bech32.decode(str, 1_000);
    const buff = bech32.fromWords(nKey.words);
    return utils.bytesToHex(Uint8Array.from(buff));
  } catch (e) {
    return str;
  }
}
