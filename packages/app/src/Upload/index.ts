import useLogin from "Hooks/useLogin";
import { RawEvent } from "@snort/nostr";
import useEventPublisher from "Feed/EventPublisher";

import NostrBuild from "Upload/NostrBuild";
import VoidCat from "Upload/VoidCat";
import NostrImg from "Upload/NostrImg";

export interface UploadResult {
  url?: string;
  error?: string;

  /**
   * NIP-94 File Header
   */
  header?: RawEvent;
}

export interface Uploader {
  upload: (f: File | Blob, filename: string) => Promise<UploadResult>;
}

export default function useFileUpload(): Uploader {
  const fileUploader = useLogin().preferences.fileUploader;
  const publisher = useEventPublisher();

  switch (fileUploader) {
    case "nostr.build": {
      return {
        upload: NostrBuild,
      } as Uploader;
    }
    case "nostrimg.com": {
      return {
        upload: NostrImg,
      } as Uploader;
    }
    default: {
      return {
        upload: (f, n) => VoidCat(f, n, publisher),
      } as Uploader;
    }
  }
}
