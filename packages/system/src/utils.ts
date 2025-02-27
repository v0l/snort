import { equalProp } from "@snort/shared";
import { FlatReqFilter } from "./query-optimizer";
import { NostrEvent, ReqFilter } from "./nostr";

export function findTag(e: NostrEvent, tag: string) {
  const maybeTag = e.tags.find(evTag => {
    return evTag[0] === tag;
  });
  return maybeTag && maybeTag[1];
}

export function findWholeTag(e: NostrEvent, tag: string) {
  const maybeTag = e.tags.find(evTag => {
    return evTag[0] === tag;
  });
  return maybeTag;
}

export function reqFilterEq(a: FlatReqFilter | ReqFilter, b: FlatReqFilter | ReqFilter): boolean {
  return (
    equalProp(a.ids, b.ids) &&
    equalProp(a.kinds, b.kinds) &&
    equalProp(a.authors, b.authors) &&
    equalProp(a.limit, b.limit) &&
    equalProp(a.since, b.since) &&
    equalProp(a.until, b.until) &&
    equalProp(a.search, b.search) &&
    equalProp(a["#e"], b["#e"]) &&
    equalProp(a["#p"], b["#p"]) &&
    equalProp(a["#t"], b["#t"]) &&
    equalProp(a["#d"], b["#d"]) &&
    equalProp(a["#r"], b["#r"])
  );
}

export function flatFilterEq(a: FlatReqFilter, b: FlatReqFilter): boolean {
  return (
    a.keys === b.keys &&
    a.since === b.since &&
    a.until === b.until &&
    a.limit === b.limit &&
    a.search === b.search &&
    a.ids === b.ids &&
    a.kinds === b.kinds &&
    a.authors === b.authors &&
    a["#e"] === b["#e"] &&
    a["#p"] === b["#p"] &&
    a["#t"] === b["#t"] &&
    a["#d"] === b["#d"] &&
    a["#r"] === b["#r"]
  );
}

export function splitByUrl(str: string) {
  const urlRegex =
    /((?:http|ftp|https|nostr|web\+nostr|magnet|lnurl[p|w]?):\/?\/?(?:[\w+?.\w+])+(?:[\p{L}\p{N}~!@#$%^&*()_\-=+\\/?.:;',]*)?(?:[-a-z0-9+&@#/%=~()_|]))/iu;

  return str.split(urlRegex);
}

export function getHex64(json: string, field: string): string {
  let len = field.length + 3;
  let idx = json.indexOf(`"${field}":`) + len;
  let s = json.slice(idx).indexOf(`"`) + idx + 1;
  return json.slice(s, s + 64);
}
