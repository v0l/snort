import { useContext, useSyncExternalStore } from "react";
import { HexKey, MetadataCache } from "@snort/system";
import { SnortContext } from "./context";

/**
 * Gets a profile from cache or requests it from the relays
 */
export function useUserProfile(pubKey?: HexKey): MetadataCache | undefined {
  const system = useContext(SnortContext);
  return useSyncExternalStore<MetadataCache | undefined>(
    h => {
      if (pubKey) {
        system.ProfileLoader.TrackKeys(pubKey);
      }
      const release = system.ProfileLoader.Cache.hook(h, pubKey);
      return () => {
        release();
        if (pubKey) {
          system.ProfileLoader.UntrackKeys(pubKey);
        }
      };
    },
    () => system.ProfileLoader.Cache.getFromCache(pubKey),
  );
}
