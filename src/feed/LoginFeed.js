import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { addDirectMessage, addNotifications, setFollows, setRelays } from "../state/Login";
import { setUserData } from "../state/Users";
import { db } from "../db";
import useSubscription from "./Subscription";
import { mapEventToProfile } from "./UsersFeed";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
    const dispatch = useDispatch();
    const [pubKey, readNotifications] = useSelector(s => [s.login.publicKey, s.login.readNotifications]);

    const sub = useMemo(() => {
        if (!pubKey) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `login:${sub.Id}`;
        sub.Authors.add(pubKey);
        sub.Kinds.add(EventKind.ContactList);
        sub.Kinds.add(EventKind.SetMetadata);
        sub.Kinds.add(EventKind.DirectMessage);

        let notifications = new Subscriptions();
        notifications.Kinds.add(EventKind.TextNote);
        notifications.Kinds.add(EventKind.DirectMessage);
        notifications.PTags.add(pubKey);
        notifications.Limit = 100;
        sub.AddSubscription(notifications);

        return sub;
    }, [pubKey]);

    const { notes } = useSubscription(sub, { leaveOpen: true });

    useEffect(() => {
        let contactList = notes.filter(a => a.kind === EventKind.ContactList);
        let notifications = notes.filter(a => a.kind === EventKind.TextNote);
        let metadata = notes.filter(a => a.kind === EventKind.SetMetadata)
        let profiles = metadata.map(a => mapEventToProfile(a));
        let dms = notes.filter(a => a.kind === EventKind.DirectMessage);

        for (let cl of contactList) {
            if (cl.content !== "") {
                let relays = JSON.parse(cl.content);
                dispatch(setRelays({ relays, createdAt: cl.created_at }));
            }
            let pTags = cl.tags.filter(a => a[0] === "p").map(a => a[1]);
            dispatch(setFollows(pTags));
        }

        if ("Notification" in window && Notification.permission === "granted") {
            for (let nx in notifications.filter(a => (a.created_at * 1000) > readNotifications)) {
                //let n = new Notification(`New reply!`, { body: nx.content, icon: Nostrich });
                //console.log(n);
            }
        }
        dispatch(addNotifications(notifications));
        dispatch(setUserData(profiles));
        const userMetadata = metadata.map(ev => {
          return {...JSON.parse(ev.content), pubkey: ev.pubkey }
        })
        db.users.bulkPut(metadata);
        dispatch(addDirectMessage(dms));
    }, [notes]);
}