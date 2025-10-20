import { useContext, useSyncExternalStore } from "react";
import { CachedMetadata } from "@snort/system";
import { SnortContext } from "./context";

/**
 * Gets a profile from cache or requests it from the relays
 */
export function useUserProfile(pubKey?: string): CachedMetadata | undefined {
  const system = useContext(SnortContext);
  return useSyncExternalStore<CachedMetadata | undefined>(
    h => {
      if (pubKey) {
        const handler = (keys: Array<string>) => {
          if (keys.includes(pubKey)) {
            h();
          }
        };
        system.profileLoader.cache.on("change", handler);
        system.profileLoader.TrackKeys(pubKey);

        return () => {
          system.profileLoader.cache.off("change", handler);
          system.profileLoader.UntrackKeys(pubKey);
        };
      }
      return () => {
        // noop
      };
    },
    () => system.profileLoader.cache.getFromCache(pubKey),
  );
}
