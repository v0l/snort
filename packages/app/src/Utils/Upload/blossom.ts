import type { BlobDescriptor, SignedEvent, Signer } from "blossom-client-sdk"
import { Actions } from "blossom-client-sdk"
import { throwIfOffline } from "@snort/shared"
import type { EventPublisher } from "@snort/system"

export type { BlobDescriptor }

function makeSigner(publisher: EventPublisher): Signer {
  return async draft => {
    const ev = await publisher.generic(eb => {
      eb.kind(draft.kind)
        .content(draft.content)
        .createdAt(draft.created_at)
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
) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.uploadBlob(server, file, {
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
) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.mirrorBlob(server, blob, {
    auth: true,
    onAuth: async (_server, _sha256, _blob) => {
      return await mirrorBlobAuth(signer, blob.sha256, blob)
    },
  })
}

export async function blossomList(
  server: string,
  publisher: EventPublisher,
  pubkey: string,
) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.listBlobs(server, pubkey, {
    auth: true,
    onAuth: async () => {
      return await listBlobsAuth(signer)
    },
  })
}

export async function blossomDelete(
  server: string,
  publisher: EventPublisher,
  hash: string,
) {
  throwIfOffline()
  const signer = makeSigner(publisher)
  return await Actions.deleteBlob(server, hash, {
    auth: true,
    onAuth: async (_server, sha256) => {
      return await deleteBlobAuth(signer, sha256)
    },
  })
}

async function uploadBlobAuth(
  signer: Signer,
  media: boolean,
  sha256: string,
  blob: File | Blob,
): Promise<SignedEvent> {
  const { createUploadAuth } = await import("blossom-client-sdk")
  return await createUploadAuth(signer, blob, {
    type: media ? "media" : "upload",
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}

async function mirrorBlobAuth(
  signer: Signer,
  sha256: string,
  blob: BlobDescriptor,
): Promise<SignedEvent> {
  const { createMirrorAuth } = await import("blossom-client-sdk")
  return await createMirrorAuth(signer, sha256, {
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}

async function listBlobsAuth(signer: Signer): Promise<SignedEvent> {
  const { createListAuth } = await import("blossom-client-sdk")
  return await createListAuth(signer, {
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}

async function deleteBlobAuth(
  signer: Signer,
  sha256: string,
): Promise<SignedEvent> {
  const { createDeleteAuth } = await import("blossom-client-sdk")
  return await createDeleteAuth(signer, sha256, {
    expiration: Math.floor(Date.now() / 1000) + 60,
  })
}
