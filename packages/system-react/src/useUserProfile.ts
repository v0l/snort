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
        system.ProfileLoader.TrackMetadata(pubKey);
        if (process.env.HTTP_CACHE && !system.ProfileLoader.Cache.getFromCache(pubKey)) {
          try {
            fetch(`${process.env.HTTP_CACHE}/profile/${pubKey}`).then(async r => {
              if (r.ok) {
                const data = await r.json();
                if (data) {
                  system.ProfileLoader.onProfileEvent(data);
                }
              }
            });
          } catch (e) {
            console.error(e);
          }
        }
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
