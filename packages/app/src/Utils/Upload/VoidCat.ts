import { EventKind, EventPublisher } from "@snort/system";
import { UploadState, VoidApi } from "@void-cat/api";

import { FileExtensionRegex } from "@/Utils/Const";
import { UploadResult } from "@/Utils/Upload/index";
import { base64 } from "@scure/base";
import { throwIfOffline } from "@snort/shared";

/**
 * Upload file to void.cat
 * https://void.cat/swagger/index.html
 */
export default async function VoidCatUpload(
  file: File | Blob,
  filename: string,
  publisher?: EventPublisher,
  progress?: (n: number) => void,
  stage?: (n: "starting" | "hashing" | "uploading" | "done" | undefined) => void,
): Promise<UploadResult> {
  throwIfOffline();
  const auth = publisher
    ? async (url: string, method: string) => {
        const auth = await publisher.generic(eb => {
          return eb.kind(EventKind.HttpAuthentication).tag(["u", url]).tag(["method", method]);
        });
        return `Nostr ${base64.encode(new TextEncoder().encode(JSON.stringify(auth)))}`;
      }
    : undefined;
  const api = new VoidApi("https://void.cat", auth);
  const uploader = api.getUploader(
    file,
    sx => {
      stage?.(
        (() => {
          switch (sx) {
            case UploadState.Starting:
              return "starting";
            case UploadState.Hashing:
              return "hashing";
            case UploadState.Uploading:
              return "uploading";
            case UploadState.Done:
              return "done";
          }
        })(),
      );
    },
    px => {
      progress?.(px / file.size);
    },
  );

  const rsp = await uploader.upload({
    "V-Strip-Metadata": "true",
  });
  if (rsp.ok) {
    let ext = filename.match(FileExtensionRegex);
    if (rsp.file?.metadata?.mimeType === "image/webp") {
      ext = ["", "webp"];
    }
    const resultUrl = rsp.file?.metadata?.url ?? `https://void.cat/d/${rsp.file?.id}${ext ? `.${ext[1]}` : ""}`;

    const dim = rsp.file?.metadata?.mediaDimensions ? rsp.file.metadata.mediaDimensions.split("x") : undefined;
    const ret = {
      url: resultUrl,
      metadata: {
        hash: rsp.file?.metadata?.digest,
        width: dim ? Number(dim[0]) : undefined,
        height: dim ? Number(dim[1]) : undefined,
      },
    } as UploadResult;

    if (publisher) {
      // NIP-94
      /*const tags = [
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
      });*/
    }
    return ret;
  } else {
    return {
      error: rsp.errorMessage,
    };
  }
}
