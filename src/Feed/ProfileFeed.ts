import { useLiveQuery } from "dexie-react-hooks";
import { useSelector } from "react-redux";
import { useEffect, useMemo } from "react";
import { RootState } from "State/Store";
import { MetadataCache } from "State/Users";
import { useKey, useKeys } from "State/Users/Hooks";
import { HexKey } from "Nostr";
import { System } from "Nostr/System";

export function useUserProfile(pubKey: HexKey): MetadataCache | undefined {
    const users = useKey(pubKey);

    useEffect(() => {
        if (pubKey) {
            System.TrackMetadata(pubKey);
            return () => System.UntrackMetadata(pubKey);
        }
    }, [pubKey]);

    return users;
}


export function useUserProfiles(pubKeys: Array<HexKey>): Map<HexKey, MetadataCache> | undefined {
    const users = useKeys(pubKeys);

    useEffect(() => {
        if (pubKeys) {
            System.TrackMetadata(pubKeys);
            return () => System.UntrackMetadata(pubKeys);
        }
    }, [pubKeys]);

    return users;
}
