import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { db } from "../db";
import { HexKey } from "../nostr";
import { System } from "../nostr/System";

export default function useProfile(pubKey: HexKey) {
    const user = useLiveQuery(async () => {
        return await db.users.get(pubKey);
    }, [pubKey]);

    useEffect(() => {
        System.GetMetadata(pubKey);
    }, [pubKey]);

    return user;
}