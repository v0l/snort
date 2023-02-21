import * as secp from "@noble/secp256k1";
import { sha256 as hash } from "@noble/hashes/sha256";
import { bech32 } from "bech32";
import { HexKey, TaggedRawEvent, u256, EventKind, encodeTLV, NostrPrefix } from "@snort/nostr";
import { MetadataCache } from "State/Users";

export const sha256 = (str: string) => {
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
  const nKey = bech32.decode(str, 1_000);
  const buff = bech32.fromWords(nKey.words);
  return secp.utils.bytesToHex(Uint8Array.from(buff));
}

/**
 * Decode bech32 to string UTF-8
 * @param str bech32 encoded string
 * @returns
 */
export function bech32ToText(str: string) {
  const decoded = bech32.decode(str, 1000);
  const buf = bech32.fromWords(decoded.words);
  return new TextDecoder().decode(Uint8Array.from(buf));
}

/**
 * Convert hex note id to bech32 link url
 * @param hex
 * @returns
 */
export function eventLink(hex: u256) {
  return `/e/${hexToBech32(NostrPrefix.Note, hex)}`;
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
 * Convert hex pubkey to bech32 link url
 */
export function profileLink(hex: HexKey) {
  return `/p/${hexToBech32(NostrPrefix.PublicKey, hex)}`;
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
export function getReactions(notes: TaggedRawEvent[], id: u256, kind = EventKind.Reaction) {
  return notes?.filter(a => a.kind === kind && a.tags.some(a => a[0] === "e" && a[1] === id)) || [];
}

/**
 * Converts LNURL service to LN Address
 */
export function extractLnAddress(lnurl: string) {
  // some clients incorrectly set this to LNURL service, patch this
  if (lnurl.toLowerCase().startsWith("lnurl")) {
    const url = bech32ToText(lnurl);
    if (url.startsWith("http")) {
      const parsedUri = new URL(url);
      // is lightning address
      if (parsedUri.pathname.startsWith("/.well-known/lnurlp/")) {
        const pathParts = parsedUri.pathname.split("/");
        const username = pathParts[pathParts.length - 1];
        return `${username}@${parsedUri.hostname}`;
      }
    }
  }
  return lnurl;
}

export function unixNow() {
  return Math.floor(unixNowMs() / 1000);
}

export function unixNowMs() {
  return new Date().getTime();
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

export function dedupeById(events: TaggedRawEvent[]) {
  const deduped = events.reduce(
    ({ list, seen }: { list: TaggedRawEvent[]; seen: Set<HexKey> }, ev) => {
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
  return deduped.list as TaggedRawEvent[];
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

export function getNewest(rawNotes: TaggedRawEvent[]) {
  const notes = [...rawNotes];
  notes.sort((a, b) => a.created_at - b.created_at);
  if (notes.length > 0) {
    return notes[0];
  }
}

export function tagFilterOfTextRepost(note: TaggedRawEvent, id?: u256): (tag: string[], i: number) => boolean {
  return (tag, i) =>
    tag[0] === "e" && tag[3] === "mention" && note.content === `#[${i}]` && (id ? tag[1] === id : true);
}

export function groupByPubkey(acc: Record<HexKey, MetadataCache>, user: MetadataCache) {
  return { ...acc, [user.pubkey]: user };
}
