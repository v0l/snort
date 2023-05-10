import { RawEvent } from "@snort/nostr";

export interface TrendingUser {
  pubkey: string;
}

export interface TrendingUserResponse {
  profiles: Array<TrendingUser>;
}

export interface TrendingNote {
  event: RawEvent;
  author: RawEvent; // kind0 event
}

export interface TrendingNoteResponse {
  notes: Array<TrendingNote>;
}

export class NostrBandError extends Error {
  body: string;
  statusCode: number;

  constructor(message: string, body: string, status: number) {
    super(message);
    this.body = body;
    this.statusCode = status;
  }
}

export default class NostrBandApi {
  #url = "https://api.nostr.band";

  async trendingProfiles() {
    return await this.#json<TrendingUserResponse>("GET", "/v0/trending/profiles");
  }

  async trendingNotes() {
    return await this.#json<TrendingNoteResponse>("GET", "/v0/trending/notes");
  }

  async #json<T>(method: string, path: string) {
    const res = await fetch(`${this.#url}${path}`, {
      method: method ?? "GET",
    });
    if (res.ok) {
      return (await res.json()) as T;
    } else {
      throw new NostrBandError("Failed to load content from nostr.band", await res.text(), res.status);
    }
  }
}
