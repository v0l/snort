import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HexKey } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { addDirectMessage, addNotifications, setFollows, setRelays } from "../state/Login";
import { RootState } from "../state/Store";
import { db } from "../db";
import useSubscription from "./Subscription";
import { mapEventToProfile } from "../db/User";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
    const dispatch = useDispatch();
    const [pubKey, readNotifications] = useSelector<RootState, [HexKey | undefined, number]>(s => [s.login.publicKey, s.login.readNotifications]);

    const sub = useMemo(() => {
        if (!pubKey) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `login:${sub.Id}`;
        sub.Authors = new Set([pubKey]);
        sub.Kinds = new Set([EventKind.ContactList, EventKind.SetMetadata, EventKind.DirectMessage]);

        let notifications = new Subscriptions();
        notifications.Kinds = new Set([EventKind.TextNote, EventKind.DirectMessage, EventKind.Zap]);
        notifications.PTags = new Set([pubKey]);
        notifications.Limit = 100;
        sub.AddSubscription(notifications);

        return sub;
    }, [pubKey]);

    const main = useSubscription(sub, { leaveOpen: true });

    useEffect(() => {
        let contactList = main.notes.filter(a => a.kind === EventKind.ContactList);
        let notifications = main.notes.filter(a => a.kind === EventKind.TextNote || a.kind === EventKind.Zap);
        let metadata = main.notes.filter(a => a.kind === EventKind.SetMetadata);
        let profiles = metadata.map(a => mapEventToProfile(a))
            .filter(a => a !== undefined)
            .map(a => a!);
        let dms = main.notes.filter(a => a.kind === EventKind.DirectMessage);

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
        db.users.bulkPut(profiles);
        dispatch(addDirectMessage(dms));
    }, [main]);
}