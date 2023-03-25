import * as secp from "@noble/secp256k1";
import { bech32 } from "bech32";
import { HexKey } from ".";

export enum NostrPrefix {
  PublicKey = "npub",
  PrivateKey = "nsec",
  Note = "note",

  // TLV prefixes
  Profile = "nprofile",
  Event = "nevent",
  Relay = "nrelay",
  Address = "naddr",
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

export function encodeTLV(hex: string, prefix: NostrPrefix, relays?: string[]) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) {
    return "";
  }

  const enc = new TextEncoder();
  const buf = secp.utils.hexToBytes(hex);

  const tl0 = [0, buf.length, ...buf];
  const tl1 =
    relays
      ?.map((a) => {
        const data = enc.encode(a);
        return [1, data.length, ...data];
      })
      .flat() ?? [];

  return bech32.encode(prefix, bech32.toWords([...tl0, ...tl1]), 1_000);
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
      value: decodeTLVEntry(t, new Uint8Array(v)),
    });
    x += 2 + l;
  }
  return entries;
}

function decodeTLVEntry(type: TLVEntryType, data: Uint8Array) {
  switch (type) {
    case TLVEntryType.Special:
    case TLVEntryType.Author: {
      return secp.utils.bytesToHex(data);
    }
    case TLVEntryType.Kind: {
      return 0
    }
    case TLVEntryType.Relay: {
      return new TextDecoder("ASCII").decode(data);
    }
  }
}
