import { EventPublisher, type Nip94Tags, type NostrEvent } from "@snort/system";

import useEventPublisher from "@/Hooks/useEventPublisher";
import { useMediaServerList } from "@/Hooks/useMediaServerList";
import { randomSample } from "@/Utils";
import { KieranPubKey } from "@/Utils/Const";

import { Blossom } from "./blossom";
import { bech32ToHex } from "@snort/shared";

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
    return new Blossom(random, pub);
  } else if (pub) {
    return new Blossom("https://blossom.band", pub);
  }
}
