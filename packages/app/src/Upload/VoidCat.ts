import { EventKind, EventPublisher } from "@snort/system";
import { VoidApi } from "@void-cat/api";

import { FileExtensionRegex, VoidCatHost } from "Const";
import { UploadResult } from "Upload";
import { magnetURIDecode } from "SnortUtils";

/**
 * Upload file to void.cat
 * https://void.cat/swagger/index.html
 */
export default async function VoidCatUpload(
  file: File | Blob,
  filename: string,
  publisher?: EventPublisher
): Promise<UploadResult> {
  const api = new VoidApi(VoidCatHost);
  const uploader = api.getUploader(file);

  const rsp = await uploader.upload({
    "V-Strip-Metadata": "true",
  });
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
