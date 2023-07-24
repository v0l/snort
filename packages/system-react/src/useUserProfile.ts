import { useSyncExternalStore } from "react";
import { HexKey, MetadataCache, NostrSystem } from "@snort/system";

/**
 * Gets a profile from cache or requests it from the relays
 */
export function useUserProfile(system: NostrSystem, pubKey?: HexKey): MetadataCache | undefined {
  return useSyncExternalStore<MetadataCache | undefined>(
    h => {
      if (pubKey) {
        system.ProfileLoader.TrackMetadata(pubKey);
      }
      const release = system.ProfileLoader.Cache.hook(h, pubKey);
      return () => {
        release();
        if (pubKey) {
          system.ProfileLoader.UntrackMetadata(pubKey);
        }
      };
    },
    () => system.ProfileLoader.Cache.getFromCache(pubKey),
  );
}
