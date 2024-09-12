import { removeUndefined } from "@snort/shared";
import { EventKind, NostrEvent } from "@snort/system";
import { useState } from "react";
import { v4 as uuid } from "uuid";

import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { bech32ToHex, randomSample, unwrap } from "@/Utils";
import { FileExtensionRegex, KieranPubKey } from "@/Utils/Const";
import NostrBuild from "@/Utils/Upload/NostrBuild";
import NostrImg from "@/Utils/Upload/NostrImg";
import VoidCat from "@/Utils/Upload/VoidCat";

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

export default function useFileUpload(): Uploader {
  const fileUploader = usePreferences(s => s.fileUploader);
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));
  const { publisher } = useEventPublisher();
  const [progress, setProgress] = useState<Array<UploadProgress>>([]);
  const [stage, setStage] = useState<UploadStage>();

  const defaultUploader = {
    upload: async (f, n) => {
      const id = uuid();
      setProgress(s => [
        ...s,
        {
          id,
          file: f,
          progress: 0,
          stage: undefined,
        },
      ]);
      const px = (n: number) => {
        setProgress(s =>
          s.map(v =>
            v.id === id
              ? {
                  ...v,
                  progress: n,
                }
              : v,
          ),
        );
      };
      const ret = await VoidCat(f, n, publisher, px, s => setStage(s));
      setProgress(s => s.filter(a => a.id !== id));
      return ret;
    },
    progress,
    stage,
  } as Uploader;

  switch (fileUploader) {
    case "nostr.build": {
      return {
        upload: f => NostrBuild(f, publisher),
        progress: [],
      } as Uploader;
    }
    case "void.cat-NIP96": {
      return new Nip96Uploader("https://void.cat/nostr", unwrap(publisher));
    }
    case "nostrcheck.me": {
      return new Nip96Uploader("https://nostrcheck.me/api/v2/nip96", unwrap(publisher));
    }
    case "nostrimg.com": {
      return {
        upload: NostrImg,
        progress: [],
      } as Uploader;
    }
    case "nip96": {
      const servers = removeUndefined(state.getList(EventKind.StorageServerList).map(a => a.toEventTag()?.at(1)));
      if (servers.length > 0) {
        const random = randomSample(servers, 1)[0];
        return new Nip96Uploader(random, unwrap(publisher));
      } else {
        return defaultUploader;
      }
    }
    default: {
      return defaultUploader;
    }
  }
}

export const ProgressStream = (file: File | Blob, progress: (n: number) => void) => {
  let offset = 0;
  const DefaultChunkSize = 1024 * 32;

  const readChunk = async (offset: number, size: number) => {
    if (offset > file.size) {
      return new Uint8Array(0);
    }
    const end = Math.min(offset + size, file.size);
    const blob = file.slice(offset, end, file.type);
    const data = await blob.arrayBuffer();
    return new Uint8Array(data);
  };

  const rsBase = new ReadableStream(
    {
      start: async () => {},
      pull: async controller => {
        const chunk = await readChunk(offset, controller.desiredSize ?? DefaultChunkSize);
        if (chunk.byteLength === 0) {
          controller.close();
          return;
        }
        progress((offset + chunk.byteLength) / file.size);
        offset += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel: reason => {
        console.log(reason);
      },
      type: "bytes",
    },
    {
      highWaterMark: DefaultChunkSize,
    },
  );
  return rsBase;
};

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
