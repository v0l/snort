import { sha256 } from "@noble/hashes/sha2.js";
import { encodeVarInt, FINGERPRINT_SIZE } from "./utils";

export class Accumulator {
  #buf!: Uint8Array;

  constructor() {
    this.setToZero();
  }

  setToZero() {
    this.#buf = new Uint8Array(32);
  }

  add(otherBuf: Uint8Array) {
    let currCarry = 0,
      nextCarry = 0;
    const p = new DataView(this.#buf.buffer);
    const po = new DataView(otherBuf.buffer);

    for (let i = 0; i < 8; i++) {
      const offset = i * 4;
      const orig = p.getUint32(offset, true);
      const otherV = po.getUint32(offset, true);

      let next = orig;

      next += currCarry;
      next += otherV;
      if (next > 4294967295) nextCarry = 1;

      p.setUint32(offset, next & 4294967295, true);
      currCarry = nextCarry;
      nextCarry = 0;
    }
  }

  negate() {
    const p = new DataView(this.#buf.buffer);

    for (let i = 0; i < 8; i++) {
      const offset = i * 4;
      p.setUint32(offset, ~p.getUint32(offset, true));
    }

    const one = new Uint8Array(32);
    one[0] = 1;
    this.add(one);
  }

  getFingerprint(n: number) {
    const varInt = encodeVarInt(n);
    const copy = new Uint8Array(this.#buf.length + varInt.length);
    copy.set(this.#buf);
    copy.set(varInt, this.#buf.length);

    const hash = sha256(copy);
    return hash.subarray(0, FINGERPRINT_SIZE);
  }
}
