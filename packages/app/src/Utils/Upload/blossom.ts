import { bytesToHex } from "@noble/hashes/utils.js";
import { base64 } from "@scure/base";
import { throwIfOffline, unixNow } from "@snort/shared";
import type { EventKind, EventPublisher } from "@snort/system";

export interface BlobDescriptor {
  url?: string;
  sha256: string;
  size: number;
  type?: string;
  uploaded?: number;
  nip94?: Array<Array<string>>;
}

export class Blossom {
  constructor(
    readonly url: string,
    readonly publisher: EventPublisher,
  ) {
    this.url = new URL(this.url).toString();
  }

  async upload(file: File) {
    const hash = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const tags = [["x", bytesToHex(new Uint8Array(hash))]];

    const rsp = await this.#req("upload", "PUT", "upload", file, tags);
    if (rsp.ok) {
      const json = await rsp.json();
      if ("error" in json && typeof json.error === "string") {
        throw new Error(json.error);
      }
      const ret = json as BlobDescriptor;
      this.#fixTags(ret);
      return ret;
    } else {
      const text = await rsp.text();
      throw new Error(text);
    }
  }

  async media(file: File) {
    const hash = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const tags = [["x", bytesToHex(new Uint8Array(hash))]];

    const rsp = await this.#req("media", "PUT", "media", file, tags);
    if (rsp.ok) {
      const ret = (await rsp.json()) as BlobDescriptor;
      this.#fixTags(ret);
      return ret;
    } else {
      const text = await rsp.text();
      throw new Error(text);
    }
  }

  async mirror(url: string) {
    const rsp = await this.#req("mirror", "PUT", "mirror", JSON.stringify({ url }), undefined, {
      "content-type": "application/json",
    });
    if (rsp.ok) {
      const ret = (await rsp.json()) as BlobDescriptor;
      this.#fixTags(ret);
      return ret;
    } else {
      const text = await rsp.text();
      throw new Error(text);
    }
  }

  async list(pk: string) {
    const rsp = await this.#req(`list/${pk}`, "GET", "list");
    if (rsp.ok) {
      const ret = (await rsp.json()) as Array<BlobDescriptor>;
      ret.forEach(a => this.#fixTags(a));
      return ret;
    } else {
      const text = await rsp.text();
      throw new Error(text);
    }
  }

  async delete(id: string) {
    const tags = [["x", id]];

    const rsp = await this.#req(id, "DELETE", "delete", undefined, tags);
    if (!rsp.ok) {
      const text = await rsp.text();
      throw new Error(text);
    }
  }

  #fixTags(r: BlobDescriptor) {
    if (!r.nip94) return;
    if (Array.isArray(r.nip94)) return;
    // blossom.band invalid response
    if (r.nip94 && "tags" in r.nip94) {
      r.nip94 = r.nip94["tags"];
      return;
    }
    r.nip94 = Object.entries(r.nip94 as Record<string, string>);
  }

  async #req(
    path: string,
    method: "GET" | "POST" | "DELETE" | "PUT",
    term: string,
    body?: BodyInit,
    tags?: Array<Array<string>>,
    headers?: Record<string, string>,
  ) {
    throwIfOffline();

    const url = `${this.url}${path}`;
    const now = unixNow();
    const auth = async (url: string, method: string) => {
      const auth = await this.publisher.generic(eb => {
        eb.kind(24_242 as EventKind)
          .tag(["u", url])
          .tag(["method", method.toLowerCase()])
          .tag(["t", term])
          .tag(["expiration", (now + 10).toString()]);
        tags?.forEach(t => eb.tag(t));
        return eb;
      });
      return `Nostr ${base64.encode(new TextEncoder().encode(JSON.stringify(auth)))}`;
    };

    return await fetch(url, {
      method,
      body,
      headers: {
        ...headers,
        accept: "application/json",
        authorization: await auth(url, method),
      },
    });
  }
}
