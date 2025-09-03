/* eslint-disable max-lines */
import * as utils from "@noble/curves/abstract/utils";
import * as secp from "@noble/curves/secp256k1";
import { hmac } from "@noble/hashes/hmac";
import { sha256 as hash } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { base32hex, bech32 } from "@scure/base";
import { isHex, isOffline } from "@snort/shared";
import {
  CachedMetadata,
  encodeTLV,
  EventKind,
  HexKey,
  NostrEvent,
  NostrLink,
  NostrPrefix,
  TaggedNostrEvent,
  u256,
  UserMetadata,
} from "@snort/system";

import Nostrich from "@/assets/img/nostrich.webp";
import AnimalName from "@/Components/User/AnimalName";
import { Birthday, Day } from "@/Utils/Const";

import TZ from "../tz.json";
import { LoginStore } from "./Login";

export const sha256 = (str: string | Uint8Array): u256 => {
  return utils.bytesToHex(hash(str));
};

export function getPublicKey(privKey: HexKey) {
  return utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
}

export async function openFile(): Promise<File | undefined> {
  return new Promise(resolve => {
    const elm = document.createElement("input");
    let lock = false;
    elm.type = "file";
    const handleInput = (e: Event) => {
      lock = true;
      const elm = e.target as HTMLInputElement;
      if ((elm.files?.length ?? 0) > 0) {
        resolve(elm.files![0]);
      } else {
        resolve(undefined);
      }
    };

    elm.onchange = e => handleInput(e);
    elm.click();
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!lock) {
            resolve(undefined);
          }
        }, 300);
      },
      { once: true },
    );
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
  const nKey = bech32.decode(str, 10_000);
  const buff = bech32.fromWords(nKey.words);
  return bytesToHex(buff);
}

/**
 * Decode bech32 to string UTF-8
 * @param str bech32 encoded string
 * @returns
 */
export function bech32ToText(str: string) {
  const nKey = bech32.decode(str, 10_000);
  const buff = bech32.fromWords(nKey.words);
  return new TextDecoder().decode(buff);
}

/**
 * Convert hex note id to bech32 link url
 * @param hex
 * @returns
 */
export function eventLink(hex: u256, relays?: Array<string> | string) {
  const encoded = relays
    ? encodeTLV(NostrPrefix.Event, hex, Array.isArray(relays) ? relays : [relays])
    : hexToBech32(NostrPrefix.Note, hex);
  return `/${encoded}`;
}

/**
 * Convert hex to bech32
 */
export function hexToBech32(hrp: string, hex?: string) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0 || !isHex(hex)) {
    return "";
  }

  try {
    if (hrp === NostrPrefix.Note || hrp === NostrPrefix.PrivateKey || hrp === NostrPrefix.PublicKey) {
      const buf = utils.hexToBytes(hex);
      return bech32.encode(hrp, bech32.toWords(buf));
    } else {
      return encodeTLV(hrp as NostrPrefix, hex);
    }
  } catch (e) {
    console.warn("Invalid hex", hex, e);
    return "";
  }
}
export function getLinkReactions(
  notes: ReadonlyArray<TaggedNostrEvent> | undefined,
  link: NostrLink,
  kind?: EventKind,
) {
  return notes?.filter(a => a.kind === (kind ?? a.kind) && link.isReplyToThis(a)) || [];
}

export function getAllLinkReactions(
  notes: readonly TaggedNostrEvent[] | undefined,
  links: Array<NostrLink>,
  kind?: EventKind,
) {
  return notes?.filter(a => a.kind === (kind ?? a.kind) && links.some(b => b.isReplyToThis(a))) || [];
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

export function dedupeByPubkey(events: TaggedNostrEvent[]) {
  const deduped = events.reduce(
    ({ list, seen }: { list: TaggedNostrEvent[]; seen: Set<HexKey> }, ev) => {
      if (seen.has(ev.pubkey)) {
        return { list, seen };
      }
      seen.add(ev.pubkey);
      return {
        seen,
        list: [...list, ev],
      };
    },
    { list: [], seen: new Set([]) },
  );
  return deduped.list as TaggedNostrEvent[];
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
    { list: [], seen: new Set([]) },
  );
  return deduped.list as Array<T>;
}

/**
 * Return newest event by pubkey
 * @param events List of all notes to filter from
 * @returns
 */
export function getLatestByPubkey(events: TaggedNostrEvent[]): Map<HexKey, TaggedNostrEvent> {
  const deduped = events.reduce((results: Map<HexKey, TaggedNostrEvent>, ev) => {
    if (!results.has(ev.pubkey)) {
      const latest = getNewest(events.filter(a => a.pubkey === ev.pubkey));
      if (latest) {
        results.set(ev.pubkey, latest);
      }
    }
    return results;
  }, new Map<HexKey, TaggedNostrEvent>());
  return deduped;
}

export function getLatestProfileByPubkey(profiles: CachedMetadata[]): Map<HexKey, CachedMetadata> {
  const deduped = profiles.reduce((results: Map<HexKey, CachedMetadata>, ev) => {
    if (!results.has(ev.pubkey)) {
      const latest = getNewestProfile(profiles.filter(a => a.pubkey === ev.pubkey));
      if (latest) {
        results.set(ev.pubkey, latest);
      }
    }
    return results;
  }, new Map<HexKey, CachedMetadata>());
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

export function getNewest(rawNotes: readonly TaggedNostrEvent[]) {
  const notes = [...rawNotes];
  notes.sort((a, b) => b.created_at - a.created_at);
  if (notes.length > 0) {
    return notes[0];
  }
}

export function getNewestProfile(rawNotes: CachedMetadata[]) {
  const notes = [...rawNotes];
  notes.sort((a, b) => b.created - a.created);
  if (notes.length > 0) {
    return notes[0];
  }
}

export function getNewestEventTagsByKey(evs: TaggedNostrEvent[], tag: string) {
  const newest = getNewest(evs);
  if (newest) {
    const keys = newest.tags.filter(p => p && p.length === 2 && p[0] === tag).map(p => p[1]);
    return {
      keys,
      createdAt: newest.created_at,
    };
  }
}

export function tagFilterOfTextRepost(note: TaggedNostrEvent, id?: u256): (tag: string[], i: number) => boolean {
  return (tag, i) =>
    tag[0] === "e" && tag[3] === "mention" && note.content === `#[${i}]` && (id ? tag[1] === id : true);
}

export function groupByPubkey(acc: Record<HexKey, CachedMetadata>, user: CachedMetadata) {
  return { ...acc, [user.pubkey]: user };
}

export const delay = (t: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, t);
  });
};

export function orderAscending<T>(arr: Array<T & { created_at: number }>) {
  return arr.sort((a, b) => (b.created_at > a.created_at ? -1 : 1));
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
            const decodedStr = base32hex.decode(m[1]);
            result.infoHash = [bytesToHex(decodedStr)];
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

export function findTag(e: NostrEvent, tag: string) {
  const maybeTag = e.tags.find(evTag => {
    return evTag[0] === tag;
  });
  return maybeTag && maybeTag[1];
}

export function hmacSha256(key: Uint8Array, ...messages: Uint8Array[]) {
  return hmac(hash, key, utils.concatBytes(...messages));
}

export function getRelayName(url: string) {
  const parsedUrl = new URL(url);
  return parsedUrl.host + parsedUrl.search;
}

export function getUrlHostname(url?: string) {
  try {
    return new URL(url ?? "").hostname;
  } catch {
    return url?.match(/(\S+\.\S+)/i)?.[1] ?? url;
  }
}

export function sanitizeRelayUrl(url?: string) {
  if ((url?.length ?? 0) === 0) return;
  try {
    return new URL(url!).toString();
  } catch {
    // ignore
  }
}

export function kvToObject<T>(o: string, sep?: string) {
  return Object.fromEntries(
    o.split(sep ?? ",").map(v => {
      const match = v.trim().match(/^(\w+)="(.*)"$/);
      if (match) {
        return [match[1], match[2]];
      }
      return [];
    }),
  ) as T;
}

export function defaultAvatar(input?: string) {
  if (isOffline()) return Nostrich;
  const key = (input?.length ?? 0) === 0 ? "missing" : input;
  return `https://nostr-api.v0l.io/api/v1/avatar/${isHalloween() ? "zombies" : "cyberpunks"}/${key}.webp`;
}

export function isFormElement(target: HTMLElement): boolean {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }

  return false;
}

const ThisYear = new Date().getFullYear();
const IsTheSeason = (target: Date, window: number) => {
  const now = new Date();
  const days = (target.getTime() - now.getTime()) / (Day * 1000);
  return (days >= 0 && days <= window) || (now.getDate() === target.getDate() && now.getMonth() === target.getMonth());
};

export const isHalloween = () => {
  const event = new Date(ThisYear, 9, 31);
  return IsTheSeason(event, 7);
};

export const isStPatricksDay = () => {
  const event = new Date(ThisYear, 2, 17);
  return IsTheSeason(event, 1);
};

export const isChristmas = () => {
  const event = new Date(ThisYear, 11, 25);
  return IsTheSeason(event, 7);
};

export const isBirthday = () => {
  const event = new Date(ThisYear, Birthday.getMonth(), Birthday.getDate());
  return CONFIG.appName === "Snort" && IsTheSeason(event, 1);
};

export function getDisplayName(user: UserMetadata | undefined, pubkey: HexKey): string {
  return getDisplayNameOrPlaceHolder(user, pubkey)[0];
}

export function getDisplayNameOrPlaceHolder(user: UserMetadata | undefined, pubkey: HexKey): [string, boolean] {
  if (typeof user?.display_name === "string" && user.display_name.length > 0) {
    return [user.display_name.trim(), false];
  } else if (typeof user?.name === "string" && user.name.length > 0) {
    return [user.name.trim(), false];
  } else if (pubkey && CONFIG.animalNamePlaceholders) {
    return [AnimalName(pubkey), true];
  }

  return [hexToBech32(NostrPrefix.PublicKey, pubkey).substring(0, 12), false];
}

export function getCountry() {
  const tz = Intl.DateTimeFormat().resolvedOptions();
  const info = (TZ as Record<string, Array<string> | undefined>)[tz.timeZone];
  const pos = info?.[1];
  const sep = Number(pos?.slice(1).search(/[-+]/)) + 1;
  const [lat, lon] = [pos?.slice(0, sep) ?? "00", pos?.slice(sep) ?? "000"];
  return {
    zone: tz.timeZone,
    country: info?.[0],
    lat: Number(lat) / Math.pow(10, lat.length - 3),
    lon: Number(lon) / Math.pow(10, lon.length - 4),
    info,
  };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function trackEvent(
  event: string,
  props?: Record<string, string | boolean>,
  e?: { destination?: { url: string } },
) {
  if (
    !import.meta.env.DEV &&
    CONFIG.features.analytics &&
    (LoginStore.snapshot().state.appdata?.preferences.telemetry ?? true)
  ) {
    fetch("https://pa.v0l.io/api/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        d: CONFIG.hostname,
        n: event,
        r: document.referrer === window.location.href ? null : document.referrer,
        p: props,
        u: e?.destination?.url ?? `${window.location.protocol}//${window.location.host}${window.location.pathname}`,
      }),
    });
  }
}

export function storeRefCode() {
  const ref = getCurrentRefCode();
  if (ref) {
    window.localStorage.setItem("ref", ref);
  }
}

export function getCurrentRefCode() {
  if (window.location.search) {
    const q = new URLSearchParams(window.location.search);
    const ref = q.get("ref");
    if (ref) {
      return ref;
    }
  }
}

export function getRefCode() {
  const r = window.localStorage.getItem("ref");
  if (r) return r;
}

export function deleteRefCode() {
  window.localStorage.removeItem("ref");
}
