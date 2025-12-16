import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { bech32 } from "@scure/base";
import { NostrPrefix } from ".";

export enum TLVEntryType {
  Special = 0,
  Relay = 1,
  Author = 2,
  Kind = 3,
}

export interface TLVEntry {
  type: TLVEntryType;
  length: number;
  value: string | number;
}

// Max length of any nostr link in chars
const MaxLength = 10_000;

export function encodeTLV(prefix: string, id: Uint8Array, relays?: string[], kind?: number, author?: string) {
  const tl0 = [0, id.length, ...id];
  const tl1 =
    relays
      ?.flatMap(a => {
        const data = utf8ToBytes(a);
        return [1, data.length, ...data];
      }) ?? [];

  const tl2 = author ? [2, 32, ...hexToBytes(author)] : [];
  const tl3 = kind ? [3, 4, ...new Uint8Array(new Uint32Array([kind]).buffer).reverse()] : [];

  return bech32.encode(prefix, bech32.toWords(new Uint8Array([...tl0, ...tl1, ...tl2, ...tl3])), MaxLength);
}

export function encodeTLVEntries(prefix: string, ...entries: Array<TLVEntry>) {
  const enc = new TextEncoder();
  const buffers: Array<number> = [];

  for (const v of entries) {
    switch (v.type) {
      case TLVEntryType.Special: {
        const buf = prefix === NostrPrefix.Address ? enc.encode(v.value as string) : hexToBytes(v.value as string);
        buffers.push(0, buf.length, ...buf);
        break;
      }
      case TLVEntryType.Relay: {
        const data = enc.encode(v.value as string);
        buffers.push(1, data.length, ...data);
        break;
      }
      case TLVEntryType.Author: {
        if ((v.value as string).length !== 64) throw new Error("Author must be 32 bytes");
        buffers.push(2, 32, ...hexToBytes(v.value as string));
        break;
      }
      case TLVEntryType.Kind: {
        if (typeof v.value !== "number") throw new Error("Kind must be a number");
        buffers.push(3, 4, ...new Uint8Array(new Uint32Array([v.value as number]).buffer).reverse());
        break;
      }
    }
  }
  return bech32.encode(prefix, bech32.toWords(new Uint8Array(buffers)), MaxLength);
}

export function decodeTLV(str: string) {
  const decoded = bech32.decode(str as `${string}1${string}`, MaxLength);
  const data = bech32.fromWords(decoded.words);

  const entries: TLVEntry[] = [];
  let x = 0;
  while (x < data.length) {
    const t = data[x];
    const l = data[x + 1];
    const v = data.slice(x + 2, x + 2 + l);
    entries.push({
      type: t,
      length: l,
      value: decodeTLVEntry(t, decoded.prefix, new Uint8Array(v)),
    });
    x += 2 + l;
  }
  return entries;
}

function decodeTLVEntry(type: TLVEntryType, prefix: string, data: Uint8Array) {
  switch (type) {
    case TLVEntryType.Special: {
      if (prefix === NostrPrefix.Address) {
        return new TextDecoder().decode(data);
      } else {
        return bytesToHex(data);
      }
    }
    case TLVEntryType.Author: {
      return bytesToHex(data);
    }
    case TLVEntryType.Kind: {
      return new Uint32Array(new Uint8Array(data.reverse()).buffer)[0];
    }
    case TLVEntryType.Relay: {
      return new TextDecoder().decode(data);
    }
  }
}
