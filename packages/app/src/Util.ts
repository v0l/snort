import * as secp from "@noble/secp256k1";
import { sha256 as hash } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { bytesToHex } from "@noble/hashes/utils";
import { decode as invoiceDecode } from "light-bolt11-decoder";
import { bech32 } from "bech32";
import base32Decode from "base32-decode";
import {
  HexKey,
  TaggedRawEvent,
  u256,
  EventKind,
  encodeTLV,
  NostrPrefix,
  decodeTLV,
  TLVEntryType,
  RawEvent,
} from "@snort/nostr";
import { MetadataCache } from "Cache";

export const sha256 = (str: string | Uint8Array): u256 => {
  return secp.utils.bytesToHex(hash(str));
};

export async function openFile(): Promise<File | undefined> {
  return new Promise(resolve => {
    const elm = document.createElement("input");
    elm.type = "file";
    elm.onchange = (e: Event) => {
      const elm = e.target as HTMLInputElement;
      if (elm.files) {
        resolve(elm.files[0]);
      } else {
        resolve(undefined);
      }
    };
    elm.click();
  });
}

/**
 * Parse bech32 ids
 * https://github.com/nostr-protocol/nips/blob/master/19.md
 * @param id bech32 id
 */
export function parseId(id: string) {
  const hrp = ["note", "npub", "nsec"];
  try {
    if (hrp.some(a => id.startsWith(a))) {
      return bech32ToHex(id);
    }
  } catch (e) {
    // Ignore the error.
  }
  return id;
}

export function bech32ToHex(str: string) {
  try {
    const nKey = bech32.decode(str, 1_000);
    const buff = bech32.fromWords(nKey.words);
    return secp.utils.bytesToHex(Uint8Array.from(buff));
  } catch {
    return str;
  }
}

/**
 * Decode bech32 to string UTF-8
 * @param str bech32 encoded string
 * @returns
 */
export function bech32ToText(str: string) {
  try {
    const decoded = bech32.decode(str, 1000);
    const buf = bech32.fromWords(decoded.words);
    return new TextDecoder().decode(Uint8Array.from(buf));
  } catch {
    return "";
  }
}

/**
 * Convert hex note id to bech32 link url
 * @param hex
 * @returns
 */
export function eventLink(hex: u256, relays?: Array<string> | string) {
  const encoded = relays
    ? encodeTLV(hex, NostrPrefix.Event, Array.isArray(relays) ? relays : [relays])
    : hexToBech32(NostrPrefix.Note, hex);
  return `/e/${encoded}`;
}

/**
 * Convert hex pubkey to bech32 link url
 */
export function profileLink(hex: HexKey, relays?: Array<string> | string) {
  const encoded = relays
    ? encodeTLV(hex, NostrPrefix.Profile, Array.isArray(relays) ? relays : [relays])
    : hexToBech32(NostrPrefix.PublicKey, hex);
  return `/p/${encoded}`;
}

/**
 * Convert hex to bech32
 */
export function hexToBech32(hrp: string, hex?: string) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) {
    return "";
  }

  try {
    if (hrp === NostrPrefix.Note || hrp === NostrPrefix.PrivateKey || hrp === NostrPrefix.PublicKey) {
      const buf = secp.utils.hexToBytes(hex);
      return bech32.encode(hrp, bech32.toWords(buf));
    } else {
      return encodeTLV(hex, hrp as NostrPrefix);
    }
  } catch (e) {
    console.warn("Invalid hex", hex, e);
    return "";
  }
}

/**
 * Reaction types
 */
export const Reaction = {
  Positive: "+",
  Negative: "-",
};

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

/**
 * Get reactions to a specific event (#e + kind filter)
 */
export function getReactions(notes: readonly TaggedRawEvent[] | undefined, id: u256, kind?: EventKind) {
  return notes?.filter(a => a.kind === (kind ?? a.kind) && a.tags.some(a => a[0] === "e" && a[1] === id)) || [];
}

export function getAllReactions(notes: readonly TaggedRawEvent[] | undefined, ids: Array<u256>, kind?: EventKind) {
  return notes?.filter(a => a.kind === (kind ?? a.kind) && a.tags.some(a => a[0] === "e" && ids.includes(a[1]))) || [];
}

export function unixNow() {
  return Math.floor(unixNowMs() / 1000);
}

export function unixNowMs() {
  return new Date().getTime();
}

export function deepClone<T>(obj: T) {
  if ("structuredClone" in window) {
    return structuredClone(obj);
  } else {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Simple debounce
 */
export function debounce(timeout: number, fn: () => void) {
  const t = setTimeout(fn, timeout);
  return () => clearTimeout(t);
}

export function dedupeByPubkey(events: TaggedRawEvent[]) {
  const deduped = events.reduce(
    ({ list, seen }: { list: TaggedRawEvent[]; seen: Set<HexKey> }, ev) => {
      if (seen.has(ev.pubkey)) {
        return { list, seen };
      }
      seen.add(ev.pubkey);
      return {
        seen,
        list: [...list, ev],
      };
    },
    { list: [], seen: new Set([]) }
  );
  return deduped.list as TaggedRawEvent[];
}

export function dedupeById<T extends { id: string }>(events: Array<T>) {
  const deduped = events.reduce(
    ({ list, seen }: { list: Array<T>; seen: Set<string> }, ev) => {
      if (seen.has(ev.id)) {
        return { list, seen };
      }
      seen.add(ev.id);
      return {
        seen,
        list: [...list, ev],
      };
    },
    { list: [], seen: new Set([]) }
  );
  return deduped.list as Array<T>;
}

/**
 * Return newest event by pubkey
 * @param events List of all notes to filter from
 * @returns
 */
export function getLatestByPubkey(events: TaggedRawEvent[]): Map<HexKey, TaggedRawEvent> {
  const deduped = events.reduce((results: Map<HexKey, TaggedRawEvent>, ev) => {
    if (!results.has(ev.pubkey)) {
      const latest = getNewest(events.filter(a => a.pubkey === ev.pubkey));
      if (latest) {
        results.set(ev.pubkey, latest);
      }
    }
    return results;
  }, new Map<HexKey, TaggedRawEvent>());
  return deduped;
}

export function getLatestProfileByPubkey(profiles: MetadataCache[]): Map<HexKey, MetadataCache> {
  const deduped = profiles.reduce((results: Map<HexKey, MetadataCache>, ev) => {
    if (!results.has(ev.pubkey)) {
      const latest = getNewestProfile(profiles.filter(a => a.pubkey === ev.pubkey));
      if (latest) {
        results.set(ev.pubkey, latest);
      }
    }
    return results;
  }, new Map<HexKey, MetadataCache>());
  return deduped;
}

export function dedupe<T>(v: Array<T>) {
  return [...new Set(v)];
}

export function appendDedupe<T>(a?: Array<T>, b?: Array<T>) {
  return dedupe([...(a ?? []), ...(b ?? [])]);
}

export function unwrap<T>(v: T | undefined | null): T {
  if (v === undefined || v === null) {
    throw new Error("missing value");
  }
  return v;
}

export function randomSample<T>(coll: T[], size: number) {
  const random = [...coll];
  return random.sort(() => (Math.random() >= 0.5 ? 1 : -1)).slice(0, size);
}

export function getNewest(rawNotes: readonly TaggedRawEvent[]) {
  const notes = [...rawNotes];
  notes.sort((a, b) => b.created_at - a.created_at);
  if (notes.length > 0) {
    return notes[0];
  }
}

export function getNewestProfile(rawNotes: MetadataCache[]) {
  const notes = [...rawNotes];
  notes.sort((a, b) => b.created - a.created);
  if (notes.length > 0) {
    return notes[0];
  }
}

export function getNewestEventTagsByKey(evs: TaggedRawEvent[], tag: string) {
  const newest = getNewest(evs);
  if (newest) {
    const keys = newest.tags.filter(p => p && p.length === 2 && p[0] === tag).map(p => p[1]);
    return {
      keys,
      createdAt: newest.created_at,
    };
  }
}

export function tagFilterOfTextRepost(note: TaggedRawEvent, id?: u256): (tag: string[], i: number) => boolean {
  return (tag, i) =>
    tag[0] === "e" && tag[3] === "mention" && note.content === `#[${i}]` && (id ? tag[1] === id : true);
}

export function groupByPubkey(acc: Record<HexKey, MetadataCache>, user: MetadataCache) {
  return { ...acc, [user.pubkey]: user };
}

export function splitByUrl(str: string) {
  const urlRegex =
    /((?:http|ftp|https|nostr|web\+nostr|magnet):\/?\/?(?:[\w+?.\w+])+(?:[a-zA-Z0-9~!@#$%^&*()_\-=+\\/?.:;',]*)?(?:[-A-Za-z0-9+&@#/%=~()_|]))/i;

  return str.split(urlRegex);
}

export const delay = (t: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, t);
  });
};

export interface InvoiceDetails {
  amount?: number;
  expire?: number;
  timestamp?: number;
  description?: string;
  descriptionHash?: string;
  paymentHash?: string;
  expired: boolean;
}

export function decodeInvoice(pr: string): InvoiceDetails | undefined {
  try {
    const parsed = invoiceDecode(pr);

    const amountSection = parsed.sections.find(a => a.name === "amount");
    const amount = amountSection ? Number(amountSection.value as number | string) : undefined;

    const timestampSection = parsed.sections.find(a => a.name === "timestamp");
    const timestamp = timestampSection ? Number(timestampSection.value as number | string) : undefined;

    const expirySection = parsed.sections.find(a => a.name === "expiry");
    const expire = expirySection ? Number(expirySection.value as number | string) : undefined;
    const descriptionSection = parsed.sections.find(a => a.name === "description")?.value;
    const descriptionHashSection = parsed.sections.find(a => a.name === "description_hash")?.value;
    const paymentHashSection = parsed.sections.find(a => a.name === "payment_hash")?.value;
    const ret = {
      amount: amount,
      expire: timestamp && expire ? timestamp + expire : undefined,
      timestamp: timestamp,
      description: descriptionSection as string | undefined,
      descriptionHash: descriptionHashSection ? bytesToHex(descriptionHashSection as Uint8Array) : undefined,
      paymentHash: paymentHashSection ? bytesToHex(paymentHashSection as Uint8Array) : undefined,
      expired: false,
    };
    if (ret.expire) {
      ret.expired = ret.expire < new Date().getTime() / 1000;
    }
    return ret;
  } catch (e) {
    console.error(e);
  }
}

export interface Magnet {
  dn?: string | string[];
  tr?: string | string[];
  xs?: string | string[];
  as?: string | string[];
  ws?: string | string[];
  kt?: string[];
  ix?: number | number[];
  xt?: string | string[];
  infoHash?: string;
  raw?: string;
}

/**
 * Parse a magnet URI and return an object of keys/values
 */
export function magnetURIDecode(uri: string): Magnet | undefined {
  try {
    const result: Record<string, string | number | number[] | string[] | undefined> = {
      raw: uri,
    };

    // Support 'magnet:' and 'stream-magnet:' uris
    const data = uri.trim().split("magnet:?")[1];

    const params = data && data.length > 0 ? data.split("&") : [];

    params.forEach(param => {
      const split = param.split("=");
      const key = split[0];
      const val = decodeURIComponent(split[1]);

      if (!result[key]) {
        result[key] = [];
      }

      switch (key) {
        case "dn": {
          (result[key] as string[]).push(val.replace(/\+/g, " "));
          break;
        }
        case "kt": {
          val.split("+").forEach(e => {
            (result[key] as string[]).push(e);
          });
          break;
        }
        case "ix": {
          (result[key] as number[]).push(Number(val));
          break;
        }
        case "so": {
          // todo: not implemented yet
          break;
        }
        default: {
          (result[key] as string[]).push(val);
          break;
        }
      }
    });

    // Convenience properties for parity with `parse-torrent-file` module
    let m;
    if (result.xt) {
      const xts = Array.isArray(result.xt) ? result.xt : [result.xt];
      xts.forEach(xt => {
        if (typeof xt === "string") {
          if ((m = xt.match(/^urn:btih:(.{40})/))) {
            result.infoHash = [m[1].toLowerCase()];
          } else if ((m = xt.match(/^urn:btih:(.{32})/))) {
            const decodedStr = base32Decode(m[1], "RFC4648-HEX");
            result.infoHash = [bytesToHex(new Uint8Array(decodedStr))];
          } else if ((m = xt.match(/^urn:btmh:1220(.{64})/))) {
            result.infoHashV2 = [m[1].toLowerCase()];
          }
        }
      });
    }

    if (result.xs) {
      const xss = Array.isArray(result.xs) ? result.xs : [result.xs];
      xss.forEach(xs => {
        if (typeof xs === "string" && (m = xs.match(/^urn:btpk:(.{64})/))) {
          if (!result.publicKey) {
            result.publicKey = [];
          }
          (result.publicKey as string[]).push(m[1].toLowerCase());
        }
      });
    }

    for (const [k, v] of Object.entries(result)) {
      if (Array.isArray(v)) {
        if (v.length === 1) {
          result[k] = v[0];
        } else if (v.length === 0) {
          result[k] = undefined;
        }
      }
    }
    return result;
  } catch (e) {
    console.warn("Failed to parse magnet link", e);
  }
}

export function chunks<T>(arr: T[], length: number) {
  const result = [];
  let idx = 0;
  let n = arr.length / length;
  while (n > 0) {
    result.push(arr.slice(idx, idx + length));
    idx += length;
    n -= 1;
  }
  return result;
}

export function findTag(e: RawEvent, tag: string) {
  const maybeTag = e.tags.find(evTag => {
    return evTag[0] === tag;
  });
  return maybeTag && maybeTag[1];
}

export function hmacSha256(key: Uint8Array, ...messages: Uint8Array[]) {
  return hmac(hash, key, secp.utils.concatBytes(...messages));
}

export function getRelayName(url: string) {
  const parsedUrl = new URL(url);
  return parsedUrl.host + parsedUrl.search;
}

export interface NostrLink {
  type: NostrPrefix;
  id: string;
  kind?: number;
  author?: string;
  relays?: Array<string>;
  encode(): string;
}

export function validateNostrLink(link: string): boolean {
  try {
    const parsedLink = parseNostrLink(link);

    if (!parsedLink) {
      return false;
    }

    if (parsedLink.type === NostrPrefix.PublicKey || parsedLink.type === NostrPrefix.Note) {
      return parsedLink.id.length === 64;
    }

    return true;
  } catch {
    return false;
  }
}

export function parseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink | undefined {
  const entity = link.startsWith("web+nostr:") || link.startsWith("nostr:") ? link.split(":")[1] : link;

  const isPrefix = (prefix: NostrPrefix) => {
    return entity.startsWith(prefix);
  };

  if (isPrefix(NostrPrefix.PublicKey)) {
    const id = bech32ToHex(entity);
    return {
      type: NostrPrefix.PublicKey,
      id: id,
      encode: () => hexToBech32(NostrPrefix.PublicKey, id),
    };
  } else if (isPrefix(NostrPrefix.Note)) {
    const id = bech32ToHex(entity);
    return {
      type: NostrPrefix.Note,
      id: id,
      encode: () => hexToBech32(NostrPrefix.Note, id),
    };
  } else if (isPrefix(NostrPrefix.Profile) || isPrefix(NostrPrefix.Event) || isPrefix(NostrPrefix.Address)) {
    const decoded = decodeTLV(entity);

    const id = decoded.find(a => a.type === TLVEntryType.Special)?.value as string;
    const relays = decoded.filter(a => a.type === TLVEntryType.Relay).map(a => a.value as string);
    const author = decoded.find(a => a.type === TLVEntryType.Author)?.value as string;
    const kind = decoded.find(a => a.type === TLVEntryType.Kind)?.value as number;

    const encode = () => {
      return entity; // return original
    };
    if (isPrefix(NostrPrefix.Profile)) {
      return {
        type: NostrPrefix.Profile,
        id,
        relays,
        kind,
        author,
        encode,
      };
    } else if (isPrefix(NostrPrefix.Event)) {
      return {
        type: NostrPrefix.Event,
        id,
        relays,
        kind,
        author,
        encode,
      };
    } else if (isPrefix(NostrPrefix.Address)) {
      return {
        type: NostrPrefix.Address,
        id,
        relays,
        kind,
        author,
        encode,
      };
    }
  } else if (prefixHint) {
    return {
      type: prefixHint,
      id: link,
      encode: () => hexToBech32(prefixHint, link),
    };
  } else {
    throw new Error("Invalid nostr link");
  }
}

export function sanitizeRelayUrl(url: string) {
  try {
    return new URL(url).toString();
  } catch {
    // ignore
  }
}
