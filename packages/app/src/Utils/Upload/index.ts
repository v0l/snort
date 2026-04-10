import { EventPublisher, type Nip94Tags, type NostrEvent } from "@snort/system"

import useEventPublisher from "@/Hooks/useEventPublisher"
import { useMediaServerList } from "@/Hooks/useMediaServerList"
import { randomSample } from "@/Utils"
import { KieranPubKey } from "@/Utils/Const"

import { Blossom } from "./blossom"
import { bech32ToHex } from "@snort/shared"

export interface UploadResult {
  url?: string
  error?: string

  /**
   * NIP-94 File Header
   */
  header?: NostrEvent

  /**
   * Media metadata
   */
  metadata?: Nip94Tags
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
]

export interface Uploader {
  upload: (f: File | Blob, filename: string) => Promise<UploadResult>
  progress: Array<UploadProgress>
}

export interface UploadProgress {
  id: string
  file: File | Blob
  progress: number
  stage: UploadStage
}

export type UploadStage = "starting" | "hashing" | "uploading" | "done" | undefined

export default function useFileUpload(privKey?: string) {
  const { publisher } = useEventPublisher()
  const { servers } = useMediaServerList()

  const pub = privKey ? EventPublisher.privateKey(privKey) : publisher
  if (servers.length > 0 && pub) {
    const sampled = randomSample(servers, 3)
    const primary = sampled[0]
    const mirrors = sampled.slice(1)
    return new MultiServerBlossom(primary, mirrors, pub)
  } else if (pub) {
    return new Blossom("https://blossom.band", pub)
  }
}

class MultiServerBlossom {
  constructor(
    private primary: string,
    private mirrors: string[],
    private publisher: EventPublisher,
  ) {}

  async upload(file: File | Blob) {
    const blossom = new Blossom(this.primary, this.publisher)
    const result = await blossom.upload(file instanceof Blob ? new File([file], "blob") : file)

    const mirrorUrls = []
    for (const server of this.mirrors) {
      try {
        if (result.url) {
          const mirrorResult = await new Blossom(server, this.publisher).mirror(result.url)
          if (mirrorResult.url) {
            mirrorUrls.push(mirrorResult.url)
          }
        }
      } catch (e) {
        console.warn("Mirror upload failed for", server, e)
      }
    }

    result.nip94 ??= []
    for (const url of mirrorUrls) {
      result.nip94.push(["fallback", url])
    }

    return result
  }
}
