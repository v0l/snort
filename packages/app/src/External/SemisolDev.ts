export default class SemisolDevApi {
  readonly #url = "https://api.semisol.dev";

  suggestedFollowsUrl(pubkey: string, follows: Array<string>) {
    const query = new URLSearchParams({ pubkey, follows: JSON.stringify(follows) });
    return `${this.#url}/nosgraph/v1/recommend?${query.toString()}`;
  }
}
