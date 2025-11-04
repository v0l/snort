import { JsonApi } from "./base";

export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  og_tags?: Array<[name: string, value: string]>;
}

/**
 * API client for https://nostr-rs-api.v0l.io
 */
export class NostrServices extends JsonApi {
  readonly url: string;
  constructor(url?: string) {
    super();
    this.url = url ?? "https://nostr-rs-api.v0l.io";
  }

  linkPreview(url: string) {
    return this.getJson<LinkPreviewData>(`/preview?url=${encodeURIComponent(url)}`);
  }
}
