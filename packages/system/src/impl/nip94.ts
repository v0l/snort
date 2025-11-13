import { FileExtensionRegex } from "../const";

/**
 * https://github.com/nostr-protocol/nips/blob/master/94.md impl
 */
export class Nip94 {
  static parse(tags: Array<Array<string>>) {
    return readNip94Tags(tags);
  }
}

export interface Nip94Tags {
  url?: string;
  mimeType?: string;
  hash?: string;
  originalHash?: string;
  size?: number;
  dimensions?: [number, number];
  magnet?: string;
  blurHash?: string;
  thumb?: string;
  image?: Array<string>;
  summary?: string;
  alt?: string;
  fallback?: Array<string>;
  duration?: number;
  bitrate?: number;
}

/**
 * Read NIP-94 tags from event tags
 */
export function readNip94Tags(tags: Array<Array<string>>) {
  const res: Nip94Tags = {};
  for (const tx of tags) {
    const [k, v] = tx as [string, string | undefined];
    if (v === undefined) continue;
    switch (k) {
      case "url": {
        // if URL already set, treat next url as fallback
        if (res.url) {
          res.fallback ??= [];
          res.fallback.push(v);
        } else {
          res.url = v;
        }
        break;
      }
      case "m": {
        res.mimeType = v;
        break;
      }
      case "x": {
        res.hash = v;
        break;
      }
      case "ox": {
        res.originalHash = v;
        break;
      }
      case "size": {
        res.size = Number(v);
        break;
      }
      case "dim": {
        res.dimensions = v.split("x").map(Number) as [number, number];
        break;
      }
      case "magnet": {
        res.magnet = v;
        break;
      }
      case "blurhash": {
        res.blurHash = v;
        break;
      }
      case "thumb": {
        res.thumb = v;
        break;
      }
      case "image": {
        res.image ??= [];
        res.image.push(v);
        break;
      }
      case "summary": {
        res.summary = v;
        break;
      }
      case "alt": {
        res.alt = v;
        break;
      }
      case "fallback": {
        res.fallback ??= [];
        res.fallback.push(v);
        break;
      }
      case "duration": {
        res.duration = Number(v);
        break;
      }
      case "bitrate": {
        res.bitrate = Number(v);
        break;
      }
    }
  }
  return res;
}

export function addExtensionToNip94Url(meta: Nip94Tags) {
  if (!meta.url?.match(FileExtensionRegex) && meta.mimeType) {
    switch (meta.mimeType) {
      case "image/webp": {
        return `${meta.url}.webp`;
      }
      case "image/jpeg":
      case "image/jpg": {
        return `${meta.url}.jpg`;
      }
      case "video/mp4": {
        return `${meta.url}.mp4`;
      }
    }
  }
  return meta.url;
}
