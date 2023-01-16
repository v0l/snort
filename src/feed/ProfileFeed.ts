import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo } from "react";
import { db } from "../db";
import { HexKey } from "../nostr";
import { System } from "../nostr/System";

export default function useProfile(pubKey: HexKey | Array<HexKey>) {
    const user = useLiveQuery(async () => {
        if (pubKey) {
            if (Array.isArray(pubKey)) {
                let ret = await db.users.bulkGet(pubKey);
                return ret.filter(a => a !== undefined).map(a => a!);
            } else {
                return await db.users.get(pubKey);
            }
        }
    }, [pubKey]);

    useEffect(() => {
        if (pubKey) {
            System.TrackMetadata(pubKey);
            return () => System.UntrackMetadata(pubKey);
        }
    }, [pubKey]);

    return user;
}