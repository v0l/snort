import { NostrEvent } from "@snort/system";
import { useState } from "react";
import { v4 as uuid } from "uuid";

import useEventPublisher from "@/Hooks/useEventPublisher";
import usePreferences from "@/Hooks/usePreferences";
import { bech32ToHex, unwrap } from "@/Utils";
import { KieranPubKey } from "@/Utils/Const";
import NostrBuild from "@/Utils/Upload/NostrBuild";
import NostrImg from "@/Utils/Upload/NostrImg";
import VoidCat from "@/Utils/Upload/VoidCat";

import { Nip96Uploader } from "./Nip96";

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
  metadata?: {
    blurhash?: string;
    width?: number;
    height?: number;
    hash?: string;
  };
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
  const { fileUploader, nip96Server } = usePreferences(s => ({
    fileUploader: s.fileUploader,
    nip96Server: s.nip96Server,
  }));
  const { publisher } = useEventPublisher();
  const [progress, setProgress] = useState<Array<UploadProgress>>([]);
  const [stage, setStage] = useState<UploadStage>();

  switch (fileUploader) {
    case "nostr.build": {
      return {
        upload: f => NostrBuild(f, publisher),
        progress: [],
      } as Uploader;
    }
    case "nip96": {
      return new Nip96Uploader(unwrap(nip96Server), unwrap(publisher));
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
    default: {
      return {
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
