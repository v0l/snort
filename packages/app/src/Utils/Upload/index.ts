import { EventPublisher, NostrEvent } from "@snort/system";

import useEventPublisher from "@/Hooks/useEventPublisher";
import { useMediaServerList } from "@/Hooks/useMediaServerList";
import { bech32ToHex, randomSample } from "@/Utils";
import { FileExtensionRegex, KieranPubKey } from "@/Utils/Const";

import { Nip96Uploader } from "./Nip96";

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
}

export interface UploadResult {
  url?: string;
  error?: string;

  /**
   * NIP-94 File Header
   */
  header?: NostrEvent;

  /**
   * Media metadata
   */
  metadata?: Nip94Tags;
}

/**
 * List of supported upload services and their owners on nostr
 */
export const UploaderServices = [
  {
    name: "void.cat",
    owner: bech32ToHex(KieranPubKey),
  },
  {
    name: "nostr.build",
    owner: bech32ToHex("npub1nxy4qpqnld6kmpphjykvx2lqwvxmuxluddwjamm4nc29ds3elyzsm5avr7"),
  },
  {
    name: "nostrimg.com",
    owner: bech32ToHex("npub1xv6axulxcx6mce5mfvfzpsy89r4gee3zuknulm45cqqpmyw7680q5pxea6"),
  },
  {
    name: "nostrcheck.me",
    owner: bech32ToHex("npub138s5hey76qrnm2pmv7p8nnffhfddsm8sqzm285dyc0wy4f8a6qkqtzx624"),
  },
];

export interface Uploader {
  upload: (f: File | Blob, filename: string) => Promise<UploadResult>;
  progress: Array<UploadProgress>;
}

export interface UploadProgress {
  id: string;
  file: File | Blob;
  progress: number;
  stage: UploadStage;
}

export type UploadStage = "starting" | "hashing" | "uploading" | "done" | undefined;

export default function useFileUpload(privKey?: string) {
  const { publisher } = useEventPublisher();
  const { servers } = useMediaServerList();

  const pub = privKey ? EventPublisher.privateKey(privKey) : publisher;
  if (servers.length > 0 && pub) {
    const random = randomSample(servers, 1)[0];
    return new Nip96Uploader(random, pub);
  } else if (pub) {
    return new Nip96Uploader("https://nostr.build", pub);
  }
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

/**
 * Read NIP-94 tags from `imeta` tag
 */
export function readNip94TagsFromIMeta(tag: Array<string>) {
  const asTags = tag.slice(1).map(a => a.split(" ", 2));
  return readNip94Tags(asTags);
}

/**
 * Read NIP-94 tags from event tags
 */
export function readNip94Tags(tags: Array<Array<string>>) {
  const res: Nip94Tags = {};
  for (const tx of tags) {
    const [k, v] = tx;
    switch (k) {
      case "url": {
        res.url = v;
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
    }
  }
  return res;
}

export function nip94TagsToIMeta(meta: Nip94Tags) {
  const ret: Array<string> = ["imeta"];
  const ifPush = (key: string, value?: string | number) => {
    if (value) {
      ret.push(`${key} ${value}`);
    }
  };
  ifPush("url", meta.url);
  ifPush("m", meta.mimeType);
  ifPush("x", meta.hash);
  ifPush("ox", meta.originalHash);
  ifPush("size", meta.size);
  ifPush("dim", meta.dimensions?.join("x"));
  ifPush("magnet", meta.magnet);
  ifPush("blurhash", meta.blurHash);
  ifPush("thumb", meta.thumb);
  ifPush("summary", meta.summary);
  ifPush("alt", meta.alt);
  if (meta.image) {
    meta.image.forEach(a => ifPush("image", a));
  }
  if (meta.fallback) {
    meta.fallback.forEach(a => ifPush("fallback", a));
  }

  return ret;
}
