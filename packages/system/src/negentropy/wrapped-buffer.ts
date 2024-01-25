export class WrappedBuffer {
  #raw: Uint8Array;
  #length: number;

  constructor(buffer?: Uint8Array) {
    this.#raw = buffer ? new Uint8Array(buffer) : new Uint8Array(512);
    this.#length = buffer ? buffer.length : 0;
  }

  unwrap() {
    return this.#raw.subarray(0, this.#length);
  }

  get capacity() {
    return this.#raw.byteLength;
  }

  get length() {
    return this.#length;
  }

  set(val: ArrayLike<number>, offset?: number) {
    this.#raw.set(val, offset);
    this.#length = (offset ?? 0) + val.length;
  }

  append(val: ArrayLike<number>) {
    const targetSize = val.length + this.#length;
    this.resize(targetSize);

    this.#raw.set(val, this.#length);
    this.#length += val.length;
  }

  clear() {
    this.#length = 0;
    this.#raw.fill(0);
  }

  resize(newSize: number) {
    if (this.capacity < newSize) {
      const newCapacity = Math.max(this.capacity * 2, newSize);
      const newArr = new Uint8Array(newCapacity);
      newArr.set(this.#raw);
      this.#raw = newArr;
    }
  }

  shift() {
    const first = this.#raw[0];
    this.#raw = this.#raw.subarray(1);
    this.#length--;
    return first;
  }

  shiftN(n = 1) {
    const firstSubarray = this.#raw.subarray(0, n);
    this.#raw = this.#raw.subarray(n);
    this.#length -= n;
    return firstSubarray;
  }
}
