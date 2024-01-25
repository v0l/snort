import { VectorStorageItem } from "./vector-storage";
import { WrappedBuffer } from "./wrapped-buffer";

export const PROTOCOL_VERSION = 0x61; // Version 1
export const FINGERPRINT_SIZE = 16;

export const enum Mode {
  Skip = 0,
  Fingerprint = 1,
  IdList = 2,
}

/**
 * Decode variable int, also consumes the bytes from buf
 */
export function decodeVarInt(buf: Uint8Array | WrappedBuffer) {
  let res = 0;

  while (1) {
    if (buf.length === 0) throw Error("parse ends prematurely");
    let byte = 0;
    if (buf instanceof WrappedBuffer) {
      byte = buf.shift();
    } else {
      byte = buf[0];
      buf = buf.subarray(1);
    }
    res = (res << 7) | (byte & 127);
    if ((byte & 128) === 0) break;
  }

  return res;
}

export function encodeVarInt(n: number) {
  if (n === 0) return new Uint8Array([0]);

  let o = [];
  while (n !== 0) {
    o.push(n & 127);
    n >>>= 7;
  }
  o.reverse();

  for (let i = 0; i < o.length - 1; i++) o[i] |= 128;

  return new Uint8Array(o);
}

export function getByte(buf: WrappedBuffer) {
  return getBytes(buf, 1)[0];
}

export function getBytes(buf: WrappedBuffer | Uint8Array, n: number) {
  if (buf.length < n) throw Error("parse ends prematurely");
  if (buf instanceof WrappedBuffer) {
    return buf.shiftN(n);
  } else {
    const ret = buf.subarray(0, n);
    buf = buf.subarray(n);
    return ret;
  }
}

export function compareUint8Array(a: Uint8Array, b: Uint8Array) {
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }

  if (a.byteLength > b.byteLength) return 1;
  if (a.byteLength < b.byteLength) return -1;

  return 0;
}

export function itemCompare(a: VectorStorageItem, b: VectorStorageItem) {
  if (a.timestamp === b.timestamp) {
    return compareUint8Array(a.id, b.id);
  }

  return a.timestamp - b.timestamp;
}
