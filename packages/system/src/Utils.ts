import * as utils from "@noble/curves/abstract/utils";
import * as secp from "@noble/curves/secp256k1";
import { sha256 as sha2 } from "@noble/hashes/sha256";
import { bech32 } from "bech32";
import { NostrEvent, ReqFilter, u256 } from "./Nostr";
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

export function reqFilterEq(a: FlatReqFilter | ReqFilter, b: FlatReqFilter | ReqFilter): boolean {
  return equalProp(a.ids, b.ids)
    && equalProp(a.kinds, b.kinds)
    && equalProp(a.authors, b.authors)
    && equalProp(a.limit, b.limit)
    && equalProp(a.since, b.since)
    && equalProp(a.until, b.until)
    && equalProp(a.search, b.search)
    && equalProp(a["#e"], b["#e"])
    && equalProp(a["#p"], b["#p"])
    && equalProp(a["#t"], b["#t"])
    && equalProp(a["#d"], b["#d"])
    && equalProp(a["#r"], b["#r"]);
}

export function flatFilterEq(a: FlatReqFilter, b: FlatReqFilter): boolean {
  return a.keys === b.keys
    && a.since === b.since
    && a.until === b.until
    && a.limit === b.limit
    && a.search === b.search
    && a.ids === b.ids
    && a.kinds === b.kinds
    && a.authors === b.authors
    && a["#e"] === b["#e"]
    && a["#p"] === b["#p"]
    && a["#t"] === b["#t"]
    && a["#d"] === b["#d"]
    && a["#r"] === b["#r"];
}

export function equalProp(a: string | number | Array<string | number> | undefined, b: string | number | Array<string | number> | undefined) {
  if ((a !== undefined && b === undefined) || (a === undefined && b !== undefined)) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    if (!a.every(v => b.includes(v))) {
      return false;
    }
  }
  return a === b;
}

/**
 * Compute the "distance" between two objects by comparing their difference in properties
 * Missing/Added keys result in +10 distance
 * This is not recursive
 */
export function distance(a: any, b: any): number {
  const keys1 = Object.keys(a);
  const keys2 = Object.keys(b);
  const maxKeys = keys1.length > keys2.length ? keys1 : keys2;

  let distance = 0;
  for (const key of maxKeys) {
    if (key in a && key in b) {
      if (Array.isArray(a[key]) && Array.isArray(b[key])) {
        const aa = a[key] as Array<string | number>;
        const bb = b[key] as Array<string | number>;
        if (aa.length === bb.length) {
          if (aa.some(v => !bb.includes(v))) {
            distance++;
          }
        } else {
          distance++;
        }
      } else if (a[key] !== b[key]) {
        distance++;
      }
    } else {
      distance += 10;
    }
  }

  return distance;
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
