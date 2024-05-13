import * as utils from "@noble/curves/abstract/utils";
import { bech32 } from "@scure/base";
import { HexKey } from "./nostr";

export enum NostrPrefix {
  PublicKey = "npub",
  PrivateKey = "nsec",
  Note = "note",

  // TLV prefixes
  Profile = "nprofile",
  Event = "nevent",
  Relay = "nrelay",
  Address = "naddr",
  Req = "nreq",
}

export enum TLVEntryType {
  Special = 0,
  Relay = 1,
  Author = 2,
  Kind = 3,
}

export interface TLVEntry {
  type: TLVEntryType;
  length: number;
  value: string | HexKey | number;
}

export function encodeTLV(prefix: NostrPrefix, id: string, relays?: string[], kind?: number, author?: string) {
  const enc = new TextEncoder();
  const buf = prefix === NostrPrefix.Address ? enc.encode(id) : utils.hexToBytes(id);

  const tl0 = [0, buf.length, ...buf];
  const tl1 =
    relays
      ?.map(a => {
        const data = enc.encode(a);
        return [1, data.length, ...data];
      })
      .flat() ?? [];

  const tl2 = author ? [2, 32, ...utils.hexToBytes(author)] : [];
  const tl3 = kind ? [3, 4, ...new Uint8Array(new Uint32Array([kind]).buffer).reverse()] : [];

  return bech32.encode(prefix, bech32.toWords(new Uint8Array([...tl0, ...tl1, ...tl2, ...tl3])), 1_000);
}

export function encodeTLVEntries(prefix: NostrPrefix, ...entries: Array<TLVEntry>) {
  const enc = new TextEncoder();
  const buffers: Array<number> = [];

  for (const v of entries) {
    switch (v.type) {
      case TLVEntryType.Special: {
        const buf =
          prefix === NostrPrefix.Address || prefix === NostrPrefix.Req
            ? enc.encode(v.value as string)
            : utils.hexToBytes(v.value as string);
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
        buffers.push(2, 32, ...utils.hexToBytes(v.value as string));
        break;
      }
      case TLVEntryType.Kind: {
        if (typeof v.value !== "number") throw new Error("Kind must be a number");
        buffers.push(3, 4, ...new Uint8Array(new Uint32Array([v.value as number]).buffer).reverse());
        break;
      }
    }
  }
  return bech32.encode(prefix, bech32.toWords(new Uint8Array(buffers)), 1_000);
}

export function decodeTLV(str: string) {
  const decoded = bech32.decode(str, 1_000);
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
      if (prefix === NostrPrefix.Address || prefix === NostrPrefix.Req) {
        return new TextDecoder().decode(data);
      } else {
        return utils.bytesToHex(data);
      }
    }
    case TLVEntryType.Author: {
      return utils.bytesToHex(data);
    }
    case TLVEntryType.Kind: {
      return new Uint32Array(new Uint8Array(data.reverse()).buffer)[0];
    }
    case TLVEntryType.Relay: {
      return new TextDecoder().decode(data);
    }
  }
}
