import { useEffect, useSyncExternalStore } from "react";

import { HexKey, MetadataCache } from "@snort/system";
import { ProfileLoader } from "index";
import { UserCache } from "Cache";

export function useUserProfile(pubKey?: HexKey): MetadataCache | undefined {
  const user = useSyncExternalStore<MetadataCache | undefined>(
    h => UserCache.hook(h, pubKey),
    () => UserCache.getFromCache(pubKey)
  );

  useEffect(() => {
    if (pubKey) {
      ProfileLoader.TrackMetadata(pubKey);
      return () => ProfileLoader.UntrackMetadata(pubKey);
    }
  }, [pubKey]);

  return user;
}
