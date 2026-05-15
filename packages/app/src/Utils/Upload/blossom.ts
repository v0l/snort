import type { BlobDescriptor, SignedEvent, Signer } from "blossom-client-sdk"
import { Actions } from "blossom-client-sdk"
import { throwIfOffline } from "@snort/shared"
import type { EventPublisher } from "@snort/system"

export type { BlobDescriptor }

function makeSigner(publisher: EventPublisher): Signer {
  return async draft => {
    const ev = await publisher.generic(eb => {
      eb.kind(draft.kind).content(draft.content).createdAt(draft.created_at)
      for (const t of draft.tags) {
        eb.tag(t)
      }
      return eb
    })
    return ev as SignedEvent
  }
}

export async function blossomUpload(
  server: string,
  publisher: EventPublisher,
  file: File | Blob,
  signal?: AbortSignal,
) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.uploadBlob(server, file, {
    signal,
    auth: true,
    onAuth: async (_server, sha256, type, blob) => {
      return await uploadBlobAuth(signer, type === "media", sha256, blob)
    },
  })
}

export async function blossomMirror(
  server: string,
  publisher: EventPublisher,
  blob: BlobDescriptor,
  signal?: AbortSignal,
) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.mirrorBlob(server, blob, {
    signal,
    auth: true,
    onAuth: async (_server, _sha256, _blob) => {
      return await mirrorBlobAuth(signer, blob.sha256, blob)
    },
  })
}

export async function blossomList(server: string, publisher: EventPublisher, pubkey: string) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.listBlobs(server, pubkey, {
    auth: true,
    onAuth: async () => {
      return await listBlobsAuth(signer)
    },
  })
}

export async function blossomDelete(server: string, publisher: EventPublisher, hash: string) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.deleteBlob(server, hash, {
    auth: true,
    onAuth: async (_server, sha256) => {
      return await deleteBlobAuth(signer, sha256)
    },
  })
}

/**
 * Report a blob to blossom servers using NIP-56 report event (kind 1984)
 * @param servers - Blossom servers to report to
 * @param publisher - Event publisher for signing the report event
 * @param blobHash - SHA256 hash of the blob to report
 * @param reason - Human-readable reason for the report
 * @param signal - AbortSignal to cancel the operation
 * @returns Map of servers to result status (true = success, false = not implemented/failed)
 */
export async function blossomReport(
  servers: Array<string>,
  publisher: EventPublisher,
  blobHash: string,
  reason: string,
  signal?: AbortSignal,
): Promise<Map<string, boolean>> {
  throwIfOffline()
  const signer = makeSigner(publisher)

  // Create NIP-56 report event
  const reportEvent: SignedEvent = await signer({
    kind: 1984,
    content: reason,
    tags: [["x", blobHash, "media"]],
    created_at: Math.floor(Date.now() / 1000),
  })

  const results = new Map<string, boolean>()

  for (const server of servers) {
    try {
      const res = await fetch(`${server}/report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportEvent),
        signal,
      })

      // 201 = success, 404 = not implemented, others = failed
      if (res.status === 201 || res.status === 200) {
        results.set(server, true)
      } else if (res.status === 404) {
        // Server doesn't implement reporting
        results.set(server, false)
      } else {
        console.error(`Failed to report to ${server}: ${res.status}`)
        results.set(server, false)
      }
    } catch (error) {
      console.error("Failed to report blob to server:", server, error)
      results.set(server, false)
    }
  }

  return results
}

async function uploadBlobAuth(
  signer: Signer,
  media: boolean,
  _sha256: string,
  blob: File | Blob,
): Promise<SignedEvent> {
  const { createUploadAuth } = await import("blossom-client-sdk")
  return await createUploadAuth(signer, blob, {
    type: media ? "media" : "upload",
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}

async function mirrorBlobAuth(signer: Signer, _sha256: string, _blob: BlobDescriptor): Promise<SignedEvent> {
  const { createMirrorAuth } = await import("blossom-client-sdk")
  return await createMirrorAuth(signer, _sha256, {
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}

async function listBlobsAuth(signer: Signer): Promise<SignedEvent> {
  const { createListAuth } = await import("blossom-client-sdk")
  return await createListAuth(signer, {
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}

async function deleteBlobAuth(signer: Signer, sha256: string): Promise<SignedEvent> {
  const { createDeleteAuth } = await import("blossom-client-sdk")
  return await createDeleteAuth(signer, sha256, {
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}
