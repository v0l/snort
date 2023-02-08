import * as secp from "@noble/secp256k1";
import { sha256 as hash } from "@noble/hashes/sha256";
import { bech32 } from "bech32";
import { HexKey, RawEvent, TaggedRawEvent, u256 } from "Nostr";
import EventKind from "Nostr/EventKind";
import { MessageDescriptor } from "react-intl";

export const sha256 = (str: string) => {
  return secp.utils.bytesToHex(hash(str));
};

export async function openFile(): Promise<File | undefined> {
  return new Promise((resolve, reject) => {
    let elm = document.createElement("input");
    elm.type = "file";
    elm.onchange = (e: Event) => {
      let elm = e.target as HTMLInputElement;
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
    if (hrp.some((a) => id.startsWith(a))) {
      return bech32ToHex(id);
    }
  } catch (e) {}
  return id;
}

export function bech32ToHex(str: string) {
  let nKey = bech32.decode(str);
  let buff = bech32.fromWords(nKey.words);
  return secp.utils.bytesToHex(Uint8Array.from(buff));
}

/**
 * Decode bech32 to string UTF-8
 * @param str bech32 encoded string
 * @returns
 */
export function bech32ToText(str: string) {
  let decoded = bech32.decode(str, 1000);
  let buf = bech32.fromWords(decoded.words);
  return new TextDecoder().decode(Uint8Array.from(buf));
}

/**
 * Convert hex note id to bech32 link url
 * @param hex
 * @returns
 */
export function eventLink(hex: u256) {
  return `/e/${hexToBech32("note", hex)}`;
}

/**
 * Convert hex to bech32
 * @param {string} hex
 */
export function hexToBech32(hrp: string, hex: string) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) {
    return "";
  }

  try {
    let buf = secp.utils.hexToBytes(hex);
    return bech32.encode(hrp, bech32.toWords(buf));
  } catch (e) {
    console.warn("Invalid hex", hex, e);
    return "";
  }
}

/**
 * Convert hex pubkey to bech32 link url
 * @param {string} hex
 * @returns
 */
export function profileLink(hex: HexKey) {
  return `/p/${hexToBech32("npub", hex)}`;
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
 * @param {string} content
 * @returns
 */
export function normalizeReaction(content: string) {
  switch (content) {
    case "":
      return Reaction.Positive;
    case "🤙":
      return Reaction.Positive;
    case "❤️":
      return Reaction.Positive;
    case "👍":
      return Reaction.Positive;
    case "💯":
      return Reaction.Positive;
    case "+":
      return Reaction.Positive;
    case "-":
      return Reaction.Negative;
    case "👎":
      return Reaction.Negative;
  }
  return content;
}

/**
 * Get reactions to a specific event (#e + kind filter)
 */
export function getReactions(
  notes: TaggedRawEvent[],
  id: u256,
  kind = EventKind.Reaction
) {
  return (
    notes?.filter(
      (a) => a.kind === kind && a.tags.some((a) => a[0] === "e" && a[1] === id)
    ) || []
  );
}

/**
 * Converts LNURL service to LN Address
 * @param lnurl
 * @returns
 */
export function extractLnAddress(lnurl: string) {
  // some clients incorrectly set this to LNURL service, patch this
  if (lnurl.toLowerCase().startsWith("lnurl")) {
    let url = bech32ToText(lnurl);
    if (url.startsWith("http")) {
      let parsedUri = new URL(url);
      // is lightning address
      if (parsedUri.pathname.startsWith("/.well-known/lnurlp/")) {
        let pathParts = parsedUri.pathname.split("/");
        let username = pathParts[pathParts.length - 1];
        return `${username}@${parsedUri.hostname}`;
      }
    }
  }
  return lnurl;
}

export function unixNow() {
  return Math.floor(new Date().getTime() / 1000);
}

/**
 * Simple debounce
 * @param timeout Time until falling edge
 * @param fn Callack to run on falling edge
 * @returns Cancel timeout function
 */
export function debounce(timeout: number, fn: () => void) {
  let t = setTimeout(fn, timeout);
  return () => clearTimeout(t);
}

export function addIdAndDefaultMessageToMessages(
  messages: Record<string, string>,
  messageIdPrefix: string
) {
  const result: Record<string, MessageDescriptor> = {};

  for (const key in messages) {
    result[key] = {
      id: `${messageIdPrefix}.${key}`,
      defaultMessage: messages[key],
    };
  }

  return result;
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
