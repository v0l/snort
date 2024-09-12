import { base64 } from "@scure/base";
import { throwIfOffline } from "@snort/shared";
import { EventKind, EventPublisher, NostrEvent } from "@snort/system";

import { addExtensionToNip94Url, readNip94Tags, UploadResult } from ".";

export class Nip96Uploader {
  #info?: Nip96Info;

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
    this.#info = (await rsp.json()) as Nip96Info;
    return this.#info;
  }

  async listFiles(page = 0, count = 50) {
    const rsp = await this.#req(`?page=${page}&count=${count}`, "GET");
    if (rsp.ok) {
      return (await rsp.json()) as Nip96FileList;
    }
  }

  async upload(file: File | Blob, filename: string): Promise<UploadResult> {
    const fd = new FormData();
    fd.append("size", file.size.toString());
    fd.append("caption", filename);
    fd.append("media_type", file.type);
    fd.append("file", file);

    const rsp = await this.#req("", "POST", fd);
    if (rsp.ok) {
      const data = (await rsp.json()) as Nip96Result;
      if (data.status === "success") {
        const meta = readNip94Tags(data.nip94_event.tags);
        if (
          meta.dimensions === undefined ||
          meta.dimensions.length !== 2 ||
          meta.dimensions[0] === 0 ||
          meta.dimensions[1] === 0
        ) {
          return {
            error: `Invalid dimensions: "${meta.dimensions?.join("x")}"`,
          };
        }
        return {
          url: addExtensionToNip94Url(meta),
          header: data.nip94_event,
          metadata: meta,
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

  async #req(path: string, method: "GET" | "POST" | "DELETE", body?: BodyInit) {
    throwIfOffline();
    const auth = async (url: string, method: string) => {
      const auth = await this.publisher.generic(eb => {
        return eb.kind(EventKind.HttpAuthentication).tag(["u", url]).tag(["method", method]);
      });
      return `Nostr ${base64.encode(new TextEncoder().encode(JSON.stringify(auth)))}`;
    };

    const info = this.#info ?? (await this.loadInfo());
    let u = info.api_url;
    if (u.startsWith("/")) {
      u = `${this.url}${u.slice(1)}`;
    }
    u += path;
    return await fetch(u, {
      method,
      body,
      headers: {
        accept: "application/json",
        authorization: await auth(u, method),
      },
    });
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
  nip94_event: NostrEvent;
}

export interface Nip96FileList {
  count: number;
  total: number;
  page: number;
  files: Array<NostrEvent>;
}
