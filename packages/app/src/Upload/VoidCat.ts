import * as utils from "@noble/curves/abstract/utils";
import { EventKind } from "@snort/nostr";
import { FileExtensionRegex, VoidCatHost } from "Const";
import { EventPublisher } from "System/EventPublisher";
import { UploadResult } from "Upload";
import { magnetURIDecode } from "Util";

/**
 * Upload file to void.cat
 * https://void.cat/swagger/index.html
 */
export default async function VoidCat(
  file: File | Blob,
  filename: string,
  publisher?: EventPublisher
): Promise<UploadResult> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);

  const req = await fetch(`${VoidCatHost}/upload`, {
    mode: "cors",
    method: "POST",
    body: buf,
    headers: {
      "Content-Type": "application/octet-stream",
      "V-Content-Type": file.type,
      "V-Filename": filename,
      "V-Full-Digest": utils.bytesToHex(new Uint8Array(digest)),
      "V-Description": "Upload from https://snort.social",
      "V-Strip-Metadata": "true",
    },
  });

  if (req.ok) {
    const rsp: VoidUploadResponse = await req.json();
    if (rsp.ok) {
      let ext = filename.match(FileExtensionRegex);
      if (rsp.file?.metadata?.mimeType === "image/webp") {
        ext = ["", "webp"];
      }
      const resultUrl = rsp.file?.metadata?.url ?? `${VoidCatHost}/d/${rsp.file?.id}${ext ? `.${ext[1]}` : ""}`;

      const ret = {
        url: resultUrl,
      } as UploadResult;

      if (publisher) {
        const tags = [
          ["url", resultUrl],
          ["x", rsp.file?.metadata?.digest ?? ""],
          ["m", rsp.file?.metadata?.mimeType ?? "application/octet-stream"],
        ];
        if (rsp.file?.metadata?.size) {
          tags.push(["size", rsp.file.metadata.size.toString()]);
        }
        if (rsp.file?.metadata?.magnetLink) {
          tags.push(["magnet", rsp.file.metadata.magnetLink]);
          const parsedMagnet = magnetURIDecode(rsp.file.metadata.magnetLink);
          if (parsedMagnet?.infoHash) {
            tags.push(["i", parsedMagnet?.infoHash]);
          }
        }
        ret.header = await publisher.generic(eb => {
          eb.kind(EventKind.FileHeader).content(filename);
          tags.forEach(t => eb.tag(t));
          return eb;
        });
      }
      return ret;
    } else {
      return {
        error: rsp.errorMessage,
      };
    }
  }
  return {
    error: "Upload failed",
  };
}

export type VoidUploadResponse = {
  ok: boolean;
  file?: VoidFile;
  errorMessage?: string;
};

export type VoidFile = {
  id: string;
  metadata?: VoidFileMeta;
};

export type VoidFileMeta = {
  version: number;
  id: string;
  name?: string;
  size: number;
  uploaded: Date;
  description?: string;
  mimeType?: string;
  digest?: string;
  url?: string;
  expires?: Date;
  storage?: string;
  encryptionParams?: string;
  magnetLink?: string;
};
