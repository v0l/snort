import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ProfileCacheExpire } from "../Const";
import { HexKey, TaggedRawEvent, UserMetadata } from "../nostr";
import EventKind from "../nostr/EventKind";
import { db } from "../db";
import { Subscriptions } from "../nostr/Subscriptions";
import { RootState } from "../state/Store";
import { MetadataCache, setUserData } from "../state/Users";
import useSubscription from "./Subscription";

export default function useUsersCache() {
    const dispatch = useDispatch();
    const pKeys = useSelector<RootState, HexKey[]>(s => s.users.pubKeys);
    const users = useSelector<RootState, any>(s => s.users.users);

    function isUserCached(id: HexKey) {
        let expire = new Date().getTime() - ProfileCacheExpire;
        let u = users[id];
        return u !== undefined && u.loaded > expire;
    }

    const sub = useMemo(() => {
        let needProfiles = pKeys.filter(a => !isUserCached(a));
        if (needProfiles.length === 0) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `profiles:${sub.Id}`;
        sub.Authors = new Set(needProfiles.slice(0, 20));
        sub.Kinds = new Set([EventKind.SetMetadata]);

        return sub;
    }, [pKeys]);

    const results = useSubscription(sub);

    useEffect(() => {
        let profiles: MetadataCache[] = results.notes
            .map(a => mapEventToProfile(a))
            .filter(a => a !== undefined)
            .map(a => a!);
        dispatch(setUserData(profiles));
        db.users.bulkPut(profiles);
    }, [results]);

    return results;
}

export function mapEventToProfile(ev: TaggedRawEvent) {
    try {
        let data: UserMetadata = JSON.parse(ev.content);
        return {
            pubkey: ev.pubkey,
            created: ev.created_at,
            loaded: new Date().getTime(),
            ...data
        } as MetadataCache;
    } catch (e) {
        console.error("Failed to parse JSON", ev, e);
    }
}