import { useContext, useEffect } from "react";
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

    useEffect(() => {
        if (pKeys.length > 0) {
            const sub = new Subscriptions();
            sub.Authors = new Set(pKeys);
            sub.Kinds.add(EventKind.SetMetadata);
            sub.OnEvent = (ev) => {
                let metaEvent = Event.FromObject(ev);
                let data = JSON.parse(metaEvent.Content);
                let userData = {
                    pubkey: metaEvent.PubKey,
                    ...data
                };
                dispatch(setUserData(userData));
            };

            if (system) {
                system.AddSubscription(sub);
                return () => system.RemoveSubscription(sub.Id);
            }
        }
    }, [pKeys]);
}