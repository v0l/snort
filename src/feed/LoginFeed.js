import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { addNotifications, setFollows, setRelays } from "../state/Login";
import useSubscription from "./Subscription";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
    const dispatch = useDispatch();
    const pubKey = useSelector(s => s.login.publicKey);

    const sub = useMemo(() => {
        if(pubKey === null) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `login:${sub.Id}`;
        sub.Authors.add(pubKey);
        sub.Kinds.add(EventKind.ContactList);

        let notifications = new Subscriptions();
        notifications.Kinds.add(EventKind.TextNote);
        notifications.PTags.add(pubKey);
        notifications.Limit = 100;
        sub.AddSubscription(notifications);

        return sub;
    }, [pubKey]);

    const { notes } = useSubscription(sub, { leaveOpen: true });

    useEffect(() => {
        let metadatas = notes.filter(a => a.kind === EventKind.ContactList);
        let others = notes.filter(a => a.kind !== EventKind.ContactList);

        for(let md of metadatas) {
            if (md.content !== "") {
                let relays = JSON.parse(md.content);
                dispatch(setRelays(relays));
            }
            let pTags = md.tags.filter(a => a[0] === "p").map(a => a[1]);
            dispatch(setFollows(pTags));
        }

        dispatch(addNotifications(others));
    }, [notes]);
}