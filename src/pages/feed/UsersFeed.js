import { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NostrContext } from "../../index";
import Event from "../../nostr/Event";
import EventKind from "../../nostr/EventKind";
import { Subscriptions } from "../../nostr/Subscriptions";
import { setUserData } from "../../state/Users";

export default function useUsersStore() {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    const pKeys = useSelector(s => s.users.pubKeys);
    const users = useSelector(s => s.users.users);
    const [loading, setLoading] = useState(false);

    function isUserCached(id) {
        let expire = new Date().getTime() - 60_000; // 60s expire
        let u = users[id];
        return u && (u.loaded || 0) < expire;
    }

    async function getUsers() {

        let needProfiles = pKeys.filter(a => !isUserCached(a));
        let sub = new Subscriptions();
        sub.Authors = new Set(needProfiles);
        sub.Kinds.add(EventKind.SetMetadata);

        let events = await system.RequestSubscription(sub);

        let loaded = new Date().getTime();
        let profiles = events.map(a => {
            let metaEvent = Event.FromObject(a);
            let data = JSON.parse(metaEvent.Content);
            return {
                pubkey: metaEvent.PubKey,
                fromEvent: a,
                loaded,
                ...data
            };
        });
        let missing = needProfiles.filter(a => !events.some(b => b.pubkey === a));
        let missingProfiles = missing.map(a => new{
            pubkey: a,
            loaded
        });
        dispatch(setUserData([
            ...profiles,
            ...missingProfiles
        ]));
    }

    useEffect(() => {
        if (system && pKeys.length > 0 && !loading) {

            setLoading(true);
            getUsers()
                .catch(console.error)
                .then(() => setLoading(false));
        }
    }, [system, pKeys, loading]);

    return { users };
}