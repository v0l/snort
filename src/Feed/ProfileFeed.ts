import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { db } from "Db";
import { MetadataCache } from "Db/User";
import { HexKey } from "Nostr";
import { System } from "Nostr/System";

export default function useProfile(pubKey?: HexKey | Array<HexKey> | undefined): Map<HexKey, MetadataCache> | undefined {
    const user = useLiveQuery(async () => {
        let userList = new Map<HexKey, MetadataCache>();
        if (pubKey) {
            if (Array.isArray(pubKey)) {
                let ret = await db.users.bulkGet(pubKey);
                let filtered = ret.filter(a => a !== undefined).map(a => a!);
                return new Map(filtered.map(a => [a.pubkey, a]))
            } else {
                let ret = await db.users.get(pubKey);
                if (ret) {
                    userList.set(ret.pubkey, ret);
                }
            }
        }
        return userList;
    }, [pubKey]);

    useEffect(() => {
        if (pubKey) {
            System.TrackMetadata(pubKey);
            return () => System.UntrackMetadata(pubKey);
        }
    }, [pubKey]);

    return user;
}