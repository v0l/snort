import { base64 } from "@scure/base";
import { throwIfOffline } from "@snort/shared";
import { EventKind, EventPublisher } from "@snort/system";
import { UploadResult } from "Upload";

export default async function NostrBuild(file: File | Blob, publisher?: EventPublisher): Promise<UploadResult> {
  const auth = publisher
    ? async (url: string, method: string) => {
        const auth = await publisher.generic(eb => {
          return eb.kind(EventKind.HttpAuthentication).tag(["u", url]).tag(["method", method]);
        });
        return `Nostr ${base64.encode(new TextEncoder().encode(JSON.stringify(auth)))}`;
      }
    : undefined;

  const fd = new FormData();
  fd.append("fileToUpload", file);
  fd.append("submit", "Upload Image");

  const url = "https://nostr.build/api/v2/upload/files";
  const headers = {
    accept: "application/json",
  } as Record<string, string>;
  if (auth) {
    headers["Authorization"] = await auth(url, "POST");
  }

  const rsp = await fetch(url, {
    body: fd,
    method: "POST",
    headers,
  });
  if (rsp.ok) {
    throwIfOffline();
    const data = (await rsp.json()) as NostrBuildUploadResponse;
    const res = data.data[0];
    return {
      url: res.url,
      metadata: {
        blurhash: res.blurhash,
        width: res.dimensions.width,
        height: res.dimensions.height,
      },
    };
  }
  return {
    error: "Upload failed",
  };
}

interface NostrBuildUploadResponse {
  data: Array<NostrBuildUploadData>;
}
interface NostrBuildUploadData {
  input_name: string;
  name: string;
  url: string;
  thumbnail: string;
  blurhash: string;
  sha256: string;
  type: string;
  mime: string;
  size: number;
  metadata: Record<string, string>;
  dimensions: {
    width: number;
    height: number;
  };
}
