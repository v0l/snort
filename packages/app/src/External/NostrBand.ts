import { throwIfOffline } from "@snort/shared";
import { NostrEvent } from "@snort/system";

export interface TrendingUser {
  pubkey: string;
}

export interface TrendingUserResponse {
  profiles: Array<TrendingUser>;
}

export interface TrendingNote {
  event: NostrEvent;
  author: NostrEvent; // kind0 event
}

export interface TrendingNoteResponse {
  notes: Array<TrendingNote>;
}

export interface TrendingHashtagsResponse {
  hashtags: Array<{
    hashtag: string;
    posts: number;
  }>;
}

export interface SuggestedFollow {
  pubkey: string;
}

export interface SuggestedFollowsResponse {
  profiles: Array<SuggestedFollow>;
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
  readonly #url = "https://api.nostr.band";
  readonly #supportedLangs = ["en", "de", "ja", "zh", "th", "pt", "es", "fr"];
  async trendingProfiles() {
    return await this.#json<TrendingUserResponse>("GET", "/v0/trending/profiles");
  }

  async trendingNotes(lang?: string) {
    if (lang && this.#supportedLangs.includes(lang)) {
      return await this.#json<TrendingNoteResponse>("GET", `/v0/trending/notes?lang=${lang}`);
    }
    return await this.#json<TrendingNoteResponse>("GET", "/v0/trending/notes");
  }

  async sugguestedFollows(pubkey: string) {
    return await this.#json<SuggestedFollowsResponse>("GET", `/v0/suggested/profiles/${pubkey}`);
  }

  async trendingHashtags(lang?: string) {
    if (lang && this.#supportedLangs.includes(lang)) {
      return await this.#json<TrendingHashtagsResponse>("GET", `/v0/trending/hashtags?lang=${lang}`);
    }
    return await this.#json<TrendingHashtagsResponse>("GET", "/v0/trending/hashtags");
  }

  async #json<T>(method: string, path: string, storageKey: string) {
    throwIfOffline();

    // Try to get cached data first
    const cachedData = localStorage.getItem(storageKey);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const { timestamp, data } = parsedData;

      const ageInMinutes = (new Date().getTime() - timestamp) / 1000 / 60;
      if (ageInMinutes < 15) {
        // Use cached data if it's not older than 15 minutes
        return data as T;
      }
    }

    // Fetch new data if no valid cache is found
    try {
      const res = await fetch(`${this.#url}${path}`, { method: method ?? "GET" });
      if (res.ok) {
        const data = (await res.json()) as T;
        // Cache the new data with a timestamp
        localStorage.setItem(storageKey, JSON.stringify({ data, timestamp: new Date().getTime() }));
        return data;
      } else {
        throw new NostrBandError("Failed to load content from nostr.band", await res.text(), res.status);
      }
    } catch (error) {
      if (cachedData) {
        // If an error occurs and there is cached data, return the cached data
        return JSON.parse(cachedData).data as T;
      } else {
        // If no cache is available, rethrow the error
        throw error;
      }
    }
  }
}
