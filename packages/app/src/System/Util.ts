import * as utils from "@noble/curves/abstract/utils";
import { bech32 } from "bech32";

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
