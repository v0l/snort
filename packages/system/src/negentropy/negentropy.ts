import { bytesToHex } from "@noble/hashes/utils.js";
import { WrappedBuffer } from "./wrapped-buffer";
import type { NegentropyStorageVector, VectorStorageItem } from "./vector-storage";
import {
  PROTOCOL_VERSION,
  getByte,
  encodeVarInt,
  Mode,
  decodeVarInt,
  getBytes,
  FINGERPRINT_SIZE,
  compareUint8Array,
} from "./utils";

export class Negentropy {
  readonly #storage: NegentropyStorageVector;
  readonly #frameSizeLimit: number;
  #lastTimestampIn: number;
  #lastTimestampOut: number;
  #isInitiator: boolean = false;

  constructor(storage: NegentropyStorageVector, frameSizeLimit = 0) {
    if (frameSizeLimit !== 0 && frameSizeLimit < 4096) throw Error("frameSizeLimit too small");

    this.#storage = storage;
    this.#frameSizeLimit = frameSizeLimit;

    this.#lastTimestampIn = 0;
    this.#lastTimestampOut = 0;
  }

  #bound(timestamp: number, id?: Uint8Array) {
    return { timestamp, id: id ? id : new Uint8Array(0) };
  }

  initiate() {
    if (this.#isInitiator) throw Error("already initiated");
    this.#isInitiator = true;

    const output = new WrappedBuffer();
    output.set([PROTOCOL_VERSION]);

    this.splitRange(0, this.#storage.size(), this.#bound(Number.MAX_VALUE), output);

    return this.#renderOutput(output);
  }

  setInitiator() {
    this.#isInitiator = true;
  }

  reconcile(query: WrappedBuffer | Uint8Array): [Uint8Array | undefined, Array<Uint8Array>, Array<Uint8Array>] {
    const haveIds: Array<Uint8Array> = [],
      needIds: Array<Uint8Array> = [];
    query = query instanceof WrappedBuffer ? query : new WrappedBuffer(query);

    this.#lastTimestampIn = this.#lastTimestampOut = 0; // reset for each message

    const fullOutput = new WrappedBuffer();
    fullOutput.set([PROTOCOL_VERSION]);

    const protocolVersion = getByte(query);
    if (protocolVersion < 96 || protocolVersion > 111) throw Error("invalid negentropy protocol version byte");
    if (protocolVersion !== PROTOCOL_VERSION) {
      if (this.#isInitiator)
        throw Error("unsupported negentropy protocol version requested: " + (protocolVersion - 96));
      else return [this.#renderOutput(fullOutput), haveIds, needIds];
    }

    const storageSize = this.#storage.size();
    let prevBound = this.#bound(0);
    let prevIndex = 0;
    let skip = false;

    while (query.length !== 0) {
      const o = new WrappedBuffer();

      const doSkip = () => {
        if (skip) {
          skip = false;
          o.append(this.encodeBound(prevBound));
          o.append(encodeVarInt(Mode.Skip));
        }
      };

      const currBound = this.decodeBound(query);
      const mode = query.length === 0 ? 0 : decodeVarInt(query);

      const lower = prevIndex;
      let upper = this.#storage.findLowerBound(prevIndex, storageSize, currBound);

      if (mode === Mode.Skip) {
        skip = true;
      } else if (mode === Mode.Fingerprint) {
        const theirFingerprint = getBytes(query, FINGERPRINT_SIZE);
        const ourFingerprint = this.#storage.fingerprint(lower, upper);

        if (compareUint8Array(theirFingerprint, ourFingerprint) !== 0) {
          doSkip();
          this.splitRange(lower, upper, currBound, o);
        } else {
          skip = true;
        }
      } else if (mode === Mode.IdList) {
        const numIds = decodeVarInt(query);

        const theirElems = {} as Record<string, Uint8Array>; // stringified Uint8Array -> original Uint8Array (or hex)
        for (let i = 0; i < numIds; i++) {
          const e = getBytes(query, this.#storage.idSize);
          theirElems[bytesToHex(e)] = e;
        }

        this.#storage.iterate(lower, upper, item => {
          const k = bytesToHex(item.id);
          if (!theirElems[k]) {
            // ID exists on our side, but not their side
            if (this.#isInitiator) haveIds.push(item.id);
          } else {
            // ID exists on both sides
            delete theirElems[k];
          }

          return true;
        });

        if (this.#isInitiator) {
          skip = true;

          for (const v of Object.values(theirElems)) {
            // ID exists on their side, but not our side
            needIds.push(v);
          }
        } else {
          doSkip();

          const responseIds = new WrappedBuffer();
          let numResponseIds = 0;
          let endBound = currBound;

          this.#storage.iterate(lower, upper, (item, index) => {
            if (this.exceededFrameSizeLimit(fullOutput.length + responseIds.length)) {
              endBound = item;
              upper = index; // shrink upper so that remaining range gets correct fingerprint
              return false;
            }

            responseIds.append(item.id);
            numResponseIds++;
            return true;
          });

          o.append(this.encodeBound(endBound));
          o.append(encodeVarInt(Mode.IdList));
          o.append(encodeVarInt(numResponseIds));
          o.append(responseIds.unwrap());

          fullOutput.append(o.unwrap());
          o.clear();
        }
      } else {
        throw Error("unexpected mode");
      }

      if (this.exceededFrameSizeLimit(fullOutput.length + o.length)) {
        // frameSizeLimit exceeded: Stop range processing and return a fingerprint for the remaining range
        const remainingFingerprint = this.#storage.fingerprint(upper, storageSize);

        fullOutput.append(this.encodeBound(this.#bound(Number.MAX_VALUE)));
        fullOutput.append(encodeVarInt(Mode.Fingerprint));
        fullOutput.append(remainingFingerprint);
        break;
      } else {
        fullOutput.append(o.unwrap());
      }

      prevIndex = upper;
      prevBound = currBound;
    }

    return [
      fullOutput.length === 1 && this.#isInitiator ? undefined : this.#renderOutput(fullOutput),
      haveIds,
      needIds,
    ];
  }

  async splitRange(lower: number, upper: number, upperBound: VectorStorageItem, o: WrappedBuffer) {
    const numElems = upper - lower;
    const buckets = 16;

    if (numElems < buckets * 2) {
      o.append(this.encodeBound(upperBound));
      o.append(encodeVarInt(Mode.IdList));

      o.append(encodeVarInt(numElems));
      this.#storage.iterate(lower, upper, item => {
        o.append(item.id);
        return true;
      });
    } else {
      const itemsPerBucket = Math.floor(numElems / buckets);
      const bucketsWithExtra = numElems % buckets;
      let curr = lower;

      for (let i = 0; i < buckets; i++) {
        const bucketSize = itemsPerBucket + (i < bucketsWithExtra ? 1 : 0);
        const ourFingerprint = this.#storage.fingerprint(curr, curr + bucketSize);
        curr += bucketSize;

        let nextBound;

        if (curr === upper) {
          nextBound = upperBound;
        } else {
          let prevItem: VectorStorageItem, currItem: VectorStorageItem;

          this.#storage.iterate(curr - 1, curr + 1, (item, index) => {
            if (index === curr - 1) prevItem = item;
            else currItem = item;
            return true;
          });

          nextBound = this.getMinimalBound(prevItem!, currItem!);
        }

        o.append(this.encodeBound(nextBound));
        o.append(encodeVarInt(Mode.Fingerprint));
        o.append(ourFingerprint);
      }
    }
  }

  #renderOutput(o: WrappedBuffer) {
    return o.unwrap();
  }

  exceededFrameSizeLimit(n: number) {
    return this.#frameSizeLimit && n > this.#frameSizeLimit - 200;
  }

  // Decoding
  decodeTimestampIn(encoded: Uint8Array | WrappedBuffer) {
    let timestamp = decodeVarInt(encoded);
    timestamp = timestamp === 0 ? Number.MAX_VALUE : timestamp - 1;
    if (this.#lastTimestampIn === Number.MAX_VALUE || timestamp === Number.MAX_VALUE) {
      this.#lastTimestampIn = Number.MAX_VALUE;
      return Number.MAX_VALUE;
    }
    timestamp += this.#lastTimestampIn;
    this.#lastTimestampIn = timestamp;
    return timestamp;
  }

  decodeBound(encoded: Uint8Array | WrappedBuffer) {
    const timestamp = this.decodeTimestampIn(encoded);
    const len = decodeVarInt(encoded);
    if (len > this.#storage.idSize) throw Error("bound key too long");
    const id = new Uint8Array(this.#storage.idSize);
    const encodedId = getBytes(encoded, Math.min(len, encoded.length));
    id.set(encodedId);
    return { timestamp, id: id as Uint8Array<ArrayBufferLike> };
  }

  // Encoding
  encodeTimestampOut(timestamp: number) {
    if (timestamp === Number.MAX_VALUE) {
      this.#lastTimestampOut = Number.MAX_VALUE;
      return encodeVarInt(0);
    }

    const temp = timestamp;
    timestamp -= this.#lastTimestampOut;
    this.#lastTimestampOut = temp;
    return encodeVarInt(timestamp + 1);
  }

  encodeBound(key: VectorStorageItem) {
    const tsBytes = this.encodeTimestampOut(key.timestamp);
    const idLenBytes = encodeVarInt(key.id.length);
    const output = new Uint8Array(tsBytes.length + idLenBytes.length + key.id.length);
    output.set(tsBytes);
    output.set(idLenBytes, tsBytes.length);
    output.set(key.id, tsBytes.length + idLenBytes.length);
    return output;
  }

  getMinimalBound(prev: VectorStorageItem, curr: VectorStorageItem) {
    if (curr.timestamp !== prev.timestamp) {
      return this.#bound(curr.timestamp);
    } else {
      let sharedPrefixBytes = 0;
      const currKey = curr.id;
      const prevKey = prev.id;

      for (let i = 0; i < this.#storage.idSize; i++) {
        if (currKey[i] !== prevKey[i]) break;
        sharedPrefixBytes++;
      }

      return this.#bound(curr.timestamp, curr.id.subarray(0, sharedPrefixBytes + 1));
    }
  }
}
