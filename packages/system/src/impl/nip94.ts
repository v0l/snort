import { FileExtensionRegex } from "../const"
import { extensionToMime } from "../utils"

/**
 * https://github.com/nostr-protocol/nips/blob/master/94.md impl
 */
export class Nip94 {
  static parse(tags: Array<Array<string>>) {
    return readNip94Tags(tags)
  }
}

export interface Nip94Tags {
  url?: string
  mimeType?: string
  hash?: string
  originalHash?: string
  size?: number
  dimensions?: [number, number]
  magnet?: string
  blurHash?: string
  thumb?: string
  image?: Array<string>
  summary?: string
  alt?: string
  fallback?: Array<string>
  duration?: number
  bitrate?: number
}

/**
 * Read NIP-94 tags from event tags
 */
export function readNip94Tags(tags: Array<Array<string>>) {
  const res: Nip94Tags = {}
  for (const tx of tags) {
    const [k, v] = tx as [string, string | undefined]
    if (v === undefined) continue
    switch (k) {
      case "url": {
        // if URL already set, treat next url as fallback
        if (res.url) {
          res.fallback ??= []
          res.fallback.push(v)
        } else {
          res.url = v
        }
        break
      }
      case "m": {
        res.mimeType = normalizeMimeType(v)
        break
      }
      case "x": {
        res.hash = v
        break
      }
      case "ox": {
        res.originalHash = v
        break
      }
      case "size": {
        res.size = Number(v)
        break
      }
      case "dim": {
        res.dimensions = v.split("x").map(Number) as [number, number]
        break
      }
      case "magnet": {
        res.magnet = v
        break
      }
      case "blurhash": {
        res.blurHash = v
        break
      }
      case "thumb": {
        res.thumb = v
        break
      }
      case "image": {
        res.image ??= []
        res.image.push(v)
        break
      }
      case "summary": {
        res.summary = v
        break
      }
      case "alt": {
        res.alt = v
        break
      }
      case "fallback": {
        res.fallback ??= []
        res.fallback.push(v)
        break
      }
      case "duration": {
        res.duration = Number(v)
        break
      }
      case "bitrate": {
        res.bitrate = Number(v)
        break
      }
    }
  }
  return res
}

export function addExtensionToNip94Url(meta: Nip94Tags) {
  if (!meta.url?.match(FileExtensionRegex) && meta.mimeType) {
    switch (meta.mimeType) {
      case "image/webp": {
        return `${meta.url}.webp`
      }
      case "image/jpeg":
      case "image/jpg": {
        return `${meta.url}.jpg`
      }
      case "video/mp4": {
        return `${meta.url}.mp4`
      }
    }
  }
  return meta.url
}

const KNOWN_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  gif: "image/gif",
  png: "image/png",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  m4v: "video/mp4",
  webm: "video/webm",
  m3u8: "application/x-mpegURL",
}

/**
 * Normalize short-form mime values (e.g. "jpeg") to full MIME type ("image/jpeg")
 */
export function normalizeMimeType(mime: string): string {
  // already full MIME type with slash
  if (mime.includes("/")) return mime
  // known short-forms
  const lower = mime.toLowerCase()
  if (KNOWN_MIME_TYPES[lower]) return KNOWN_MIME_TYPES[lower]
  // fallback: try extensionToMime
  const fromExt = extensionToMime(lower)
  if (fromExt) return fromExt
  return mime
}
