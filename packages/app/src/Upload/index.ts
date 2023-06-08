import useLogin from "Hooks/useLogin";
import { NostrEvent } from "@snort/system";

import NostrBuild from "Upload/NostrBuild";
import VoidCat from "Upload/VoidCat";
import NostrImg from "Upload/NostrImg";
import { KieranPubKey } from "Const";
import { bech32ToHex } from "SnortUtils";

export interface UploadResult {
  url?: string;
  error?: string;

  /**
   * NIP-94 File Header
   */
  header?: NostrEvent;
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
}

export default function useFileUpload(): Uploader {
  const fileUploader = useLogin().preferences.fileUploader;
  //const publisher = useEventPublisher();

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
        upload: (f, n) => VoidCat(f, n, undefined),
      } as Uploader;
    }
  }
}
