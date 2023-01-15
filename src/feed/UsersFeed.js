import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ProfileCacheExpire } from "../Const";
import EventKind from "../nostr/EventKind";
import { db } from "../db";
import { Subscriptions } from "../nostr/Subscriptions";
import { setUserData } from "../state/Users";
import useSubscription from "./Subscription";

export default function useUsersCache() {
    const dispatch = useDispatch();
    const pKeys = useSelector(s => s.users.pubKeys);
    const users = useSelector(s => s.users.users);

    function isUserCached(id) {
        let expire = new Date().getTime() - ProfileCacheExpire;
        let u = users[id];
        return u && u.loaded > expire;
    }

    const sub = useMemo(() => {
        let needProfiles = pKeys.filter(a => !isUserCached(a));
        if (needProfiles.length === 0) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `profiles:${sub.Id}`;
        sub.Authors = new Set(needProfiles.slice(0, 20));
        sub.Kinds.add(EventKind.SetMetadata);

        return sub;
    }, [pKeys]);

    const results = useSubscription(sub);

    useEffect(() => {
        const userData = results.notes.map(a => mapEventToProfile(a));
        dispatch(setUserData(userData));
        const profiles = results.notes.map(ev => {
          return {...JSON.parse(ev.content), pubkey: ev.pubkey }
        });
        db.users.bulkPut(profiles);
    }, [results]);

    return results;
}

export function mapEventToProfile(ev) {
    try {
        let data = JSON.parse(ev.content);
        return {
            pubkey: ev.pubkey,
            fromEvent: ev,
            loaded: new Date().getTime(),
            ...data
        };
    } catch (e) {
        console.error("Failed to parse JSON", ev, e);
    }
}