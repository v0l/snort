import { useEffect, useSyncExternalStore } from "react";
import { HexKey } from "@snort/nostr";

import { MetadataCache } from "State/Users";
import { UserCache } from "State/Users/UserCache";
import { ProfileLoader } from "System/ProfileCache";

export function useUserProfile(pubKey?: HexKey): MetadataCache | undefined {
  const user = useSyncExternalStore<MetadataCache | undefined>(
    h => UserCache.hook(h, pubKey),
    () => UserCache.get(pubKey)
  );

  useEffect(() => {
    if (pubKey) {
      ProfileLoader.TrackMetadata(pubKey);
      return () => ProfileLoader.UntrackMetadata(pubKey);
    }
  }, [pubKey]);

  return user;
}
