import { base64 } from "@scure/base";
import { throwIfOffline } from "@snort/shared";
import { EventKind, EventPublisher } from "@snort/system";

import { Uploader, UploadResult } from ".";

export class Nip96Uploader implements Uploader {
  constructor(
    readonly url: string,
    readonly publisher: EventPublisher,
  ) {
    this.url = new URL(this.url).toString();
  }

  get progress() {
    return [];
  }

  async loadInfo() {
    const u = new URL(this.url);

    const rsp = await fetch(`${u.protocol}//${u.host}/.well-known/nostr/nip96.json`);
    return (await rsp.json()) as Nip96Info;
  }

  async upload(file: File | Blob, filename: string): Promise<UploadResult> {
    throwIfOffline();
    const auth = async (url: string, method: string) => {
      const auth = await this.publisher.generic(eb => {
        return eb.kind(EventKind.HttpAuthentication).tag(["u", url]).tag(["method", method]);
      });
      return `Nostr ${base64.encode(new TextEncoder().encode(JSON.stringify(auth)))}`;
    };

    const info = await this.loadInfo();
    const fd = new FormData();
    fd.append("size", file.size.toString());
    fd.append("caption", filename);
    fd.append("media_type", file.type);
    fd.append("file", file);

    let u = info.api_url;
    if (u.startsWith("/")) {
      u = `${this.url}${u.slice(1)}`;
    }
    const rsp = await fetch(u, {
      body: fd,
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: await auth(u, "POST"),
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
            blurhash: data.nip94_event.tags.find(a => a[0] === "blurhash")?.at(1),
            hash: data.nip94_event.tags.find(a => a[0] === "x")?.at(1),
          },
        };
      }
      return {
        error: data.message,
      };
    } else {
      const text = await rsp.text();
      try {
        const obj = JSON.parse(text) as Nip96Result;
        return {
          error: obj.message,
        };
      } catch {
        return {
          error: `Upload failed: ${text}`,
        };
      }
    }
  }
}

export interface Nip96Info {
  api_url: string;
  download_url?: string;
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
