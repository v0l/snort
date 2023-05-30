import { useEffect, useSyncExternalStore } from "react";

import { HexKey } from "System";
import { MetadataCache } from "Cache";
import { UserCache } from "Cache/UserCache";
import { ProfileLoader } from "index";

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
