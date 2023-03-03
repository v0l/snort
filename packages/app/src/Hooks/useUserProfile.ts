import { useEffect, useSyncExternalStore } from "react";
import { MetadataCache } from "State/Users";
import { HexKey } from "@snort/nostr";
import { System } from "System";
import { UserCache } from "State/Users/UserCache";

export function useUserProfile(pubKey?: HexKey): MetadataCache | undefined {
  const user = useSyncExternalStore<MetadataCache | undefined>(
    h => UserCache.hook(h, pubKey),
    () => UserCache.get(pubKey)
  );

  useEffect(() => {
    if (pubKey) {
      System.TrackMetadata(pubKey);
      return () => System.UntrackMetadata(pubKey);
    }
  }, [pubKey]);

  return user;
}
