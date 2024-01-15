import { JsonApi } from ".";

export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  og_tags?: Array<[name: string, value: string]>;
}

export class NostrServices extends JsonApi {
  constructor(readonly url: string) {
    super();
    url = url.endsWith("/") ? url.slice(0, -1) : url;
  }

  linkPreview(url: string) {
    return this.getJson<LinkPreviewData>(`/api/v1/preview?url=${encodeURIComponent(url)}`);
  }
}
