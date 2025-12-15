import { useCallback, use } from "react";
import { tryParseNostrLink } from "@snort/system";
import { fetchNip05Pubkey, NostrPrefix } from "@snort/shared";
import { SnortContext } from "./context";

export function useUserSearch() {
  const system = use(SnortContext);
  const cache = system.config.profiles;

  const search = useCallback(
    async (input: string): Promise<Array<string>> => {
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
    },
    [cache],
  );

  return search;
}
