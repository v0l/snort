import { base64 } from "@scure/base";
import { throwIfOffline } from "@snort/shared";
import { EventPublisher, EventKind } from "@snort/system";
import { UploadResult, Uploader } from "Upload";

export class Nip96Uploader implements Uploader {
  constructor(
    readonly url: string,
    readonly publisher: EventPublisher,
  ) {}

  get progress() {
    return [];
  }

  async upload(file: File | Blob, filename: string): Promise<UploadResult> {
    throwIfOffline();
    const auth = async (url: string, method: string) => {
      const auth = await this.publisher.generic(eb => {
        return eb.kind(EventKind.HttpAuthentication).tag(["u", url]).tag(["method", method]);
      });
      return `Nostr ${base64.encode(new TextEncoder().encode(JSON.stringify(auth)))}`;
    };

    const fd = new FormData();
    fd.append("size", file.size.toString());
    fd.append("alt", filename);
    fd.append("media_type", file.type);
    fd.append("file", file);

    const rsp = await fetch(this.url, {
      body: fd,
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: await auth(this.url, "POST"),
      },
    });
    if (rsp.ok) {
      throwIfOffline();
      const data = (await rsp.json()) as Nip96Result;
      if (data.status === "success") {
        const dim = data.nip94_event.tags
          .find(a => a[0] === "dim")
          ?.at(1)
          ?.split("x");
        return {
          url: data.nip94_event.tags.find(a => a[0] === "url")?.at(1),
          metadata: {
            width: dim?.at(0) ? Number(dim[0]) : undefined,
            height: dim?.at(1) ? Number(dim[1]) : undefined,
          },
        };
      }
      return {
        error: data.message,
      };
    }
    return {
      error: "Upload failed",
    };
  }
}

export interface Nip96Result {
  status: string;
  message: string;
  processing_url?: string;
  nip94_event: {
    tags: Array<Array<string>>;
    content: string;
  };
}
