import { useContext } from "react";
import { NostrPrefix, UserProfileCache, tryParseNostrLink } from "@snort/system";
import { fetchNip05Pubkey } from "@snort/shared";
import { SnortContext } from "./context";

export function useUserSearch() {
  const system = useContext(SnortContext);
  const cache = system.profileLoader.cache as UserProfileCache;

  async function search(input: string): Promise<Array<string>> {
    // try exact match first
    if (input.length === 64 && [...input].every(c => !isNaN(parseInt(c, 16)))) {
      return [input];
    }

    if (input.startsWith(NostrPrefix.PublicKey) || input.startsWith(NostrPrefix.Profile)) {
      const link = tryParseNostrLink(input);
      if (link) {
        return [link.id];
      }
    }

    if (input.includes("@")) {
      const [name, domain] = input.split("@");
      const pk = await fetchNip05Pubkey(name, domain);
      if (pk) {
        return [pk];
      }
    }

    // search cache
    const cacheResults = await cache.search(input);
    return cacheResults.map(v => v.pubkey);
  }

  return search;
}
