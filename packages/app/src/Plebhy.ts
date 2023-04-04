export interface PLEBHYItem {
  type: "gif" | "sticker";
  sid: string;
  ptag: string;
  etag: string;
  name: string;
  title: string;
  images: {
    original: PLEBHYImage;
    downsized: PLEBHYImage;
  };
}

export interface PLEBHYImage {
  url: string;
  size: number;
  width: number;
  height: number;
}

export default class PLEBHY {
  #url: string;
  #key: string;

  constructor(url?: string, key?: string) {
    this.#url = url ?? "https://getcurrent.io";
    this.#key = key ?? "8B4362ACDA28567FB47C9D7BCA952";
  }

  async search(term: string, limit?: number) {
    const { data } = await this.#getJson<{ data: Array<PLEBHYItem> }>(
      `/plebhy?apikey=${this.#key}&search=${encodeURIComponent(term)}&limit=${limit ?? 10}`
    );
    return data;
  }

  async #getJson<T>(
    path: string,
    method?: "GET" | string,
    body?: { [key: string]: string },
    headers?: { [key: string]: string }
  ): Promise<T> {
    const rsp = await fetch(`${this.#url}${path}`, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
    });

    const obj = await rsp.json();
    if ("error" in obj) {
      throw new Error(obj.error);
    }
    return obj as T;
  }
}
