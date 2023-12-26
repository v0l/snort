export default class NostrBandApi {
  readonly #url = "https://api.nostr.band";
  readonly #supportedLangs = ["en", "de", "ja", "zh", "th", "pt", "es", "fr"];

  trendingProfilesUrl() {
    return `${this.#url}/v0/trending/profiles`;
  }

  trendingNotesUrl(lang?: string) {
    return `${this.#url}/v0/trending/notes${lang && this.#supportedLangs.includes(lang) ? `?lang=${lang}` : ""}`;
  }

  suggestedFollowsUrl(pubkey: string) {
    return `${this.#url}/v0/suggested/profiles/${pubkey}`;
  }

  trendingHashtagsUrl(lang?: string) {
    return `${this.#url}/v0/trending/hashtags${lang && this.#supportedLangs.includes(lang) ? `?lang=${lang}` : ""}`;
  }
}
