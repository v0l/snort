import { EventPublisher } from "@snort/system"
import { bech32ToHex } from "@snort/shared"

import useEventPublisher from "@/Hooks/useEventPublisher"
import { useMediaServerList } from "@/Hooks/useMediaServerList"
import { randomSample } from "@/Utils"
import { KieranPubKey } from "@/Utils/Const"

import { type BlobDescriptor, blossomMirror, blossomUpload } from "./blossom"

export interface UploadResult {
  url: string
  sha256: string
  size: number
  type?: string
  uploaded?: number
  nip94?: Array<Array<string>>
}

export type UploadStage = "auth" | "uploading" | "mirroring" | "processing" | "complete" | "error"

export interface UploadProgress {
  id: string
  file: File | Blob
  progress: number
  stage: UploadStage
  error?: string
  result?: UploadResult
  controller: AbortController
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
  upload: (f: File | Blob, filename?: string) => Promise<UploadResult>
}

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
    return new SingleServerBlossom("https://blossom.band", pub)
  }
}

class SingleServerBlossom implements Uploader {
  constructor(
    private server: string,
    private publisher: EventPublisher,
  ) {}

  async upload(file: File | Blob, _filename?: string, signal?: AbortSignal) {
    const result = await blossomUpload(
      this.server,
      this.publisher,
      file instanceof Blob ? new File([file], "blob") : file,
      signal,
    )
    return result as UploadResult
  }
}

class MultiServerBlossom implements Uploader {
  constructor(
    private primary: string,
    private mirrors: string[],
    private publisher: EventPublisher,
  ) {}

  async upload(file: File | Blob, _filename?: string, signal?: AbortSignal) {
    const result = (await blossomUpload(
      this.primary,
      this.publisher,
      file instanceof Blob ? new File([file], "blob") : file,
      signal,
    )) as UploadResult

    if (signal?.aborted) return result

    const mirrorUrls = []
    for (const server of this.mirrors) {
      if (signal?.aborted) break
      try {
        const mirrorResult = (await blossomMirror(
          server,
          this.publisher,
          result as unknown as BlobDescriptor,
          signal,
        )) as UploadResult
        if (mirrorResult.url) {
          mirrorUrls.push(mirrorResult.url)
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
