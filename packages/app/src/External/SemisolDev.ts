export interface RecommendedProfilesResponse {
  quality: number;
  recommendations: Array<[pubkey: string, score: number]>;
}

export class SemisolDevApiError extends Error {
  body: string;
  statusCode: number;

  constructor(message: string, body: string, status: number) {
    super(message);
    this.body = body;
    this.statusCode = status;
  }
}

export default class SemisolDevApi {
  readonly #url = "https://api.semisol.dev";

  async sugguestedFollows(pubkey: string, follows: Array<string>) {
    return await this.#json<RecommendedProfilesResponse>("POST", "/nosgraph/v1/recommend", {
      pubkey,
      exclude: [],
      following: follows,
    });
  }

  async #json<T>(method: string, path: string, body?: unknown) {
    const url = `${this.#url}${path}`;
    const res = await fetch(url, {
      method: method ?? "GET",
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
      },
    });
    if (res.ok) {
      return (await res.json()) as T;
    } else {
      throw new SemisolDevApiError(`Failed to load content from ${url}`, await res.text(), res.status);
    }
  }
}
