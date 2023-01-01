import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import Event from "../nostr/Event";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { setUserData } from "../state/Users";
import useSubscription from "./Subscription";

export default function useUsersCache() {
    const dispatch = useDispatch();
    const pKeys = useSelector(s => s.users.pubKeys);
    const users = useSelector(s => s.users.users);

    function isUserCached(id) {
        let expire = new Date().getTime() - (1_000 * 60 * 5); // 5min expire
        let u = users[id];
        return u && u.loaded > expire;
    }

    function mapEventToProfile(ev) {
        let metaEvent = Event.FromObject(ev);
        let data = JSON.parse(metaEvent.Content);
        return {
            pubkey: metaEvent.PubKey,
            fromEvent: ev,
            loaded: new Date().getTime(),
            ...data
        };
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
        dispatch(setUserData(results.notes.map(a => mapEventToProfile(a))));
    }, [results]);

    return results;
}