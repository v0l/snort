import { hexToBytes, bytesToHex, concatBytes } from "@noble/hashes/utils.js";
import * as secp from "@noble/curves/secp256k1.js";
import { sha256 as sha2 } from "@noble/hashes/sha2.js";
import { bech32 } from "@scure/base";
import { hmac } from "@noble/hashes/hmac.js";

export function unwrap<T>(v: T | undefined | null): T {
  if (v === undefined || v === null) {
    throw new Error("missing value");
  }
  return v;
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

export function jitter(n: number) {
  return n * Math.random();
}

export function deepClone<T>(obj: T) {
  if ("structuredClone" in window) {
    return structuredClone(obj);
  } else {
    return JSON.parse(JSON.stringify(obj));
  }
}

export function deepEqual(x: any, y: any): boolean {
  const ok = Object.keys,
    tx = typeof x,
    ty = typeof y;

  return x && y && tx === "object" && tx === ty
    ? ok(x).length === ok(y).length && ok(x).every(key => deepEqual(x[key], y[key]))
    : x === y;
}

export function countMembers(a: any) {
  let ret = 0;
  for (const [k, v] of Object.entries(a)) {
    if (Array.isArray(v)) {
      ret += v.length;
    }
  }
  return ret;
}

export function equalProp(
  a: string | number | Array<string | number> | undefined,
  b: string | number | Array<string | number> | undefined,
) {
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

export function dedupeBy<T>(v: Array<T>, mapper: (x: T) => string): Array<T> {
  return [
    ...v
      .reduce((acc, v) => {
        const k = mapper(v);
        if (!acc.has(k)) {
          acc.set(k, v);
        }
        return acc;
      }, new Map<string, T>())
      .values(),
  ];
}

export const sha256 = (str: string | Uint8Array): string => {
  const buf = typeof str === "string" ? new TextEncoder().encode(str) : str;
  return bytesToHex(sha2(buf));
};

export function hmacSha256(key: Uint8Array, ...messages: Uint8Array[]) {
  return hmac(sha2, key, concatBytes(...messages));
}

export function getPublicKey(privKey: string | Uint8Array) {
  const buf = typeof privKey === "string" ? hexToBytes(privKey) : privKey;
  return bytesToHex(secp.schnorr.getPublicKey(buf));
}

export function bech32ToHex(str: string) {
  const nKey = bech32.decode(str as `${string}1${string}`, 1_000);
  const buff = bech32.fromWords(nKey.words);
  return bytesToHex(Uint8Array.from(buff));
}

/**
 * Convert hex to bech32
 */
export function hexToBech32(hrp: string, id?: string) {
  if (typeof id !== "string" || id.length === 0 || id.length % 2 !== 0 || !isHex(id)) {
    return "";
  }

  try {
    const buf = hexToBytes(id);
    return bech32.encode(hrp, bech32.toWords(buf));
  } catch (e) {
    console.warn("Invalid hex", id, e);
    return "";
  }
}

/**
 * Decode bech32 to string UTF-8
 * @param str bech32 encoded string
 * @returns
 */
export function bech32ToText(str: string) {
  const decoded = bech32.decode(str as `${string}1${string}`, 1000);
  const buf = bech32.fromWords(decoded.words);
  return new TextDecoder().decode(Uint8Array.from(buf));
}

export interface NostrJson {
  names: Record<string, string>;
  relays?: Record<string, Array<string>>;
  nip46?: Record<string, Array<string>>;
}

export async function fetchNip05PubkeyWithThrow(name: string, domain: string, timeout?: number) {
  const data = await fetchNostrAddressWithThrow(name, domain, timeout);
  const match = Object.keys(data.names).find(n => {
    return n.toLowerCase() === name.toLowerCase();
  });
  if (match) {
    return data.names[match];
  } else {
    throw new Error("User not found, invalid");
  }
}

export async function fetchNip05Pubkey(name: string, domain: string, timeout?: number) {
  try {
    return await fetchNip05PubkeyWithThrow(name, domain, timeout);
  } catch {
    // ignored
  }
  return undefined;
}

export async function fetchNostrAddress(name: string, domain: string, timeout?: number) {
  if (!name || !domain) {
    return undefined;
  }
  try {
    return await fetchNostrAddressWithThrow(name, domain, timeout);
  } catch {
    // ignored
  }
  return undefined;
}

export async function fetchNostrAddressWithThrow(name: string, domain: string, timeout = 5_000) {
  if (!name || !domain) {
    throw new Error("Name and Domain must be set");
  }
  const u = new URL(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`);
  const res = await fetch(u, {
    signal: AbortSignal.timeout(timeout),
  });
  const text = await res.text();
  if (res.ok) {
    const data = JSON.parse(text) as NostrJson;
    if (!("names" in data)) {
      throw new Error(`Invalid response, code=${res.status}, body=${text}`);
    }
    return data;
  } else {
    throw new Error(`Invalid response, code=${res.status}, body=${text}`);
  }
}

export function removeUndefined<T>(v: Array<T | undefined>) {
  return v.filter(a => a !== undefined).map(a => unwrap(a));
}

/**
 * Reaction types
 */
export enum Reaction {
  Positive = "+",
  Negative = "-",
}

/**
 * Return normalized reaction content
 */
export function normalizeReaction(content: string) {
  switch (content) {
    case "-":
      return Reaction.Negative;
    case "👎":
      return Reaction.Negative;
    default:
      return Reaction.Positive;
  }
}

export class OfflineError extends Error {}

export function throwIfOffline() {
  if (isOffline()) {
    throw new OfflineError("Offline");
  }
}

export function isOffline() {
  return !("navigator" in globalThis && globalThis.navigator.onLine);
}

export function isHex(s?: string) {
  if (!s) return false;
  // 48-57 = 0-9
  // 65-70 = A-F
  // 97-102 = a-f
  return (
    s.length % 2 == 0 &&
    [...s].map(v => v.charCodeAt(0)).every(v => (v >= 48 && v <= 57) || (v >= 65 && v <= 70) || (v >= 97 && v <= 102))
  );
}
