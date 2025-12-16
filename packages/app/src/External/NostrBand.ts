import type { NostrEvent } from "@snort/system";
import { JsonApi } from "./base";

export interface TrendingProfile {
  pubkey: string;
  new_follower_count: number;
  profile?: NostrEvent;
  relays?: Array<string>;
}

export interface TrendingProfilesResponse {
  profiles: Array<TrendingProfile>;
}

export interface TrendingHashtagsResponse {
  hashtags: Array<{ hashtag: string; posts: number }>;
}

export default class NostrBandApi extends JsonApi {
  url = "https://api.nostr.band";
  readonly #supportedLangs = ["en", "de", "ja", "zh", "th", "pt", "es", "fr"];

  constructor() {
    super();
  }

  async trendingProfiles() {
    return await this.getJson<TrendingProfilesResponse>("/v0/trending/profiles");
  }

  // trendingNotesUrl(lang?: string) {
  //   return `${this.url}/v0/trending/notes${lang && this.#supportedLangs.includes(lang) ? `?lang=${lang}` : ""}`;
  // }

  // suggestedFollowsUrl(pubkey: string) {
  //   return `${this.url}/v0/suggested/profiles/${pubkey}`;
  // }

  async trendingHashtags(lang?: string) {
    return await this.getJson<TrendingHashtagsResponse>(
      `/v0/trending/hashtags${lang && this.#supportedLangs.includes(lang) ? `?lang=${lang}` : ""}`,
    );
  }
}
