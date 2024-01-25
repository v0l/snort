import { hexToBytes } from "@noble/hashes/utils";
import { Accumulator } from "./accumulator";
import { itemCompare } from "./utils";

export interface VectorStorageItem {
  timestamp: number;
  id: Uint8Array;
}

const IdSize = 32;

export class NegentropyStorageVector {
  #items: Array<VectorStorageItem> = [];
  #sealed = false;

  constructor(other?: Array<VectorStorageItem>) {
    if (other) {
      this.#items = other;
      this.#sealed = true;
    }
  }

  get idSize() {
    return IdSize;
  }

  insert(timestamp: number, id: string) {
    if (this.#sealed) throw Error("already sealed");
    const idData = hexToBytes(id);
    if (idData.byteLength !== IdSize) throw Error("bad id size for added item");
    this.#items.push({ timestamp, id: idData });
  }

  seal() {
    if (this.#sealed) throw Error("already sealed");
    this.#sealed = true;

    this.#items.sort(itemCompare);

    for (let i = 1; i < this.#items.length; i++) {
      if (itemCompare(this.#items[i - 1], this.#items[i]) === 0) {
        throw Error("duplicate item inserted");
      }
    }
  }

  unseal() {
    this.#sealed = false;
  }

  size() {
    this.#checkSealed();
    return this.#items.length;
  }

  getItem(i: number) {
    this.#checkSealed();
    if (i >= this.#items.length) throw Error("out of range");
    return this.#items[i];
  }

  iterate(begin: number, end: number, cb: (item: VectorStorageItem, index: number) => boolean) {
    this.#checkSealed();
    this.#checkBounds(begin, end);

    for (let i = begin; i < end; ++i) {
      if (!cb(this.#items[i], i)) break;
    }
  }

  findLowerBound(begin: number, end: number, bound: VectorStorageItem) {
    this.#checkSealed();
    this.#checkBounds(begin, end);

    return this.#binarySearch(this.#items, begin, end, a => itemCompare(a, bound) < 0);
  }

  fingerprint(begin: number, end: number) {
    const out = new Accumulator();

    this.iterate(begin, end, item => {
      out.add(item.id);
      return true;
    });

    return out.getFingerprint(end - begin);
  }

  #checkSealed() {
    if (!this.#sealed) throw Error("not sealed");
  }

  #checkBounds(begin: number, end: number) {
    if (begin > end || end > this.#items.length) throw Error("bad range");
  }

  #binarySearch(arr: Array<VectorStorageItem>, first: number, last: number, cmp: (item: VectorStorageItem) => boolean) {
    let count = last - first;

    while (count > 0) {
      let it = first;
      let step = Math.floor(count / 2);
      it += step;

      if (cmp(arr[it])) {
        first = ++it;
        count -= step + 1;
      } else {
        count = step;
      }
    }

    return first;
  }
}
