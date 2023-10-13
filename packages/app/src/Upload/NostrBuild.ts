import { base64 } from "@scure/base";
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
    const data = (await rsp.json()) as {
      success: boolean;
      data: Array<{
        url: string;
      }>;
    };
    return {
      url: data.data[0].url,
    };
  }
  return {
    error: "Upload failed",
  };
}
