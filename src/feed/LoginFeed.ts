import Nostrich from "../nostrich.jpg";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HexKey, TaggedRawEvent } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { addDirectMessage, addNotifications, setFollows, setRelays } from "../state/Login";
import { RootState } from "../state/Store";
import { db } from "../db";
import useSubscription from "./Subscription";
import { mapEventToProfile, MetadataCache } from "../db/User";
import { getDisplayName } from "../element/ProfileImage";
import { MentionRegex } from "../Const";

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
        notifications.Kinds = new Set([EventKind.TextNote]);
        notifications.PTags = new Set([pubKey]);
        notifications.Limit = 100;
        sub.AddSubscription(notifications);

        let dms = new Subscriptions();
        dms.Kinds = new Set([EventKind.DirectMessage]);
        dms.PTags = new Set([pubKey]);
        sub.AddSubscription(dms);

        return sub;
    }, [pubKey]);

    const main = useSubscription(sub, { leaveOpen: true });

    useEffect(() => {
        let contactList = main.notes.filter(a => a.kind === EventKind.ContactList);
        let notifications = main.notes.filter(a => a.kind === EventKind.TextNote);
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
            for (let nx of notifications.filter(a => (a.created_at * 1000) > readNotifications)) {
                sendNotification(nx)
                    .catch(console.warn);
            }
        }
        dispatch(addNotifications(notifications));
        dispatch(addDirectMessage(dms));
        (async () => {
            let maxProfile = profiles.reduce((acc, v) => {
                if (v.created > acc.created) {
                    acc.profile = v;
                    acc.created = v.created;
                }
                return acc;
            }, { created: 0, profile: <MetadataCache | null>null });
            if (maxProfile.profile) {
                let existing = await db.users.get(maxProfile.profile.pubkey);
                if ((existing?.created ?? 0) < maxProfile.created) {
                    await db.users.put(maxProfile.profile);
                }
            }
        })().catch(console.warn);
    }, [main]);
}

async function makeNotification(ev: TaggedRawEvent) {
    switch (ev.kind) {
        case EventKind.TextNote: {
            const pubkeys = new Set([ev.pubkey, ...ev.tags.filter(a => a[0] === "p").map(a => a[1]!)]);
            const users = (await db.users.bulkGet(Array.from(pubkeys))).filter(a => a !== undefined).map(a => a!);
            const fromUser = users.find(a => a?.pubkey === ev.pubkey);
            const name = getDisplayName(fromUser, ev.pubkey);
            const avatarUrl = (fromUser?.picture?.length ?? 0) === 0 ? Nostrich : fromUser?.picture;
            return {
                title: `Reply from ${name}`,
                body: replaceTagsWithUser(ev, users).substring(0, 50),
                icon: avatarUrl
            }
        }
    }
    return null;
}

function replaceTagsWithUser(ev: TaggedRawEvent, users: MetadataCache[]) {
    return ev.content.split(MentionRegex).map(match => {
        let matchTag = match.match(/#\[(\d+)\]/);
        if (matchTag && matchTag.length === 2) {
            let idx = parseInt(matchTag[1]);
            let ref = ev.tags[idx];
            if (ref && ref[0] === "p" && ref.length > 1) {
                let u = users.find(a => a.pubkey === ref[1]);
                return `@${getDisplayName(u, ref[1])}`;
            }
        }
        return match;
    }).join();
}

async function sendNotification(ev: TaggedRawEvent) {
    let n = await makeNotification(ev);
    if (n != null && Notification.permission === "granted") {
        let worker = await navigator.serviceWorker.ready;
        worker.showNotification(n.title, {
            body: n.body,
            icon: n.icon,
            tag: "notification",
            timestamp: ev.created_at * 1000,
            vibrate: [500]
        });
    }
}