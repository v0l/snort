import { useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { System } from "..";
import Event from "../nostr/Event";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { addNotifications, setFollows, setRelays } from "../state/Login";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
    const dispatch = useDispatch();
    const pubKey = useSelector(s => s.login.publicKey);

    useEffect(() => {
        if (pubKey) {
            let sub = new Subscriptions();
            sub.Id = "login";
            sub.Authors.add(pubKey);
            sub.Kinds.add(EventKind.ContactList);

            let notifications = new Subscriptions();
            notifications.Kinds.add(EventKind.TextNote);
            notifications.Kinds.add(EventKind.Reaction);
            notifications.PTags.add(pubKey);
            sub.AddSubscription(notifications);

            sub.OnEvent = (e) => {
                let ev = Event.FromObject(e);
                switch (ev.Kind) {
                    case EventKind.ContactList: {
                        if (ev.Content !== "") {
                            let relays = JSON.parse(ev.Content);
                            dispatch(setRelays(relays));
                        }
                        let pTags = ev.Tags.filter(a => a.Key === "p").map(a => a.PubKey);
                        dispatch(setFollows(pTags));
                        break;
                    }
                    default: {
                        dispatch(addNotifications(ev.ToObject()));
                        break;
                    }
                }
            }
            System.AddSubscription(sub);
            return () => System.RemoveSubscription(sub.Id);
        }
    }, [pubKey]);

    return {};
}