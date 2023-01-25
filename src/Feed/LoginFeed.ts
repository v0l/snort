import Nostrich from "nostrich.jpg";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { HexKey, TaggedRawEvent } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import { addDirectMessage, addNotifications, setFollows, setRelays } from "State/Login";
import { RootState } from "State/Store";
import { mapEventToProfile, MetadataCache  } from "State/Users";
import db from "State/Users/Db";
import useSubscription from "Feed/Subscription";
import { getDisplayName } from "Element/ProfileImage";
import { MentionRegex } from "Const";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
    const dispatch = useDispatch();
    const [pubKey, readNotifications] = useSelector<RootState, [HexKey | undefined, number]>(s => [s.login.publicKey, s.login.readNotifications]);

    const subMetadata = useMemo(() => {
        if (!pubKey) return null;

        let sub = new Subscriptions();
        sub.Id = `login:meta`;
        sub.Authors = new Set([pubKey]);
        sub.Kinds = new Set([EventKind.ContactList, EventKind.SetMetadata]);

        return sub;
    }, [pubKey]);

    const subNotification = useMemo(() => {
        if (!pubKey) return null;

        let sub = new Subscriptions();
        sub.Id = "login:notifications";
        sub.Kinds = new Set([EventKind.TextNote]);
        sub.PTags = new Set([pubKey]);
        sub.Limit = 1;
        return sub;
    }, [pubKey]);

    const subDms = useMemo(() => {
        if (!pubKey) return null;

        let dms = new Subscriptions();
        dms.Id = "login:dms";
        dms.Kinds = new Set([EventKind.DirectMessage]);
        dms.PTags = new Set([pubKey]);

        let dmsFromME = new Subscriptions();
        dmsFromME.Authors = new Set([pubKey]);
        dmsFromME.Kinds = new Set([EventKind.DirectMessage]);
        dms.AddSubscription(dmsFromME);

        return dms;
    }, [pubKey]);

    const metadataFeed = useSubscription(subMetadata, { leaveOpen: true });
    const notificationFeed = useSubscription(subNotification, { leaveOpen: true });
    const dmsFeed = useSubscription(subDms, { leaveOpen: true });

    useEffect(() => {
        let contactList = metadataFeed.store.notes.filter(a => a.kind === EventKind.ContactList);
        let metadata = metadataFeed.store.notes.filter(a => a.kind === EventKind.SetMetadata);
        let profiles = metadata.map(a => mapEventToProfile(a))
            .filter(a => a !== undefined)
            .map(a => a!);

        for (let cl of contactList) {
            if (cl.content !== "" && cl.content !== "{}") {
                let relays = JSON.parse(cl.content);
                dispatch(setRelays({ relays, createdAt: cl.created_at }));
            }
            let pTags = cl.tags.filter(a => a[0] === "p").map(a => a[1]);
            dispatch(setFollows(pTags));
        }

        (async () => {
            let maxProfile = profiles.reduce((acc, v) => {
                if (v.created > acc.created) {
                    acc.profile = v;
                    acc.created = v.created;
                }
                return acc;
            }, { created: 0, profile: <MetadataCache | null>null });
            if (maxProfile.profile) {
                let existing = await db.find(maxProfile.profile.pubkey);
                if ((existing?.created ?? 0) < maxProfile.created) {
                    await db.put(maxProfile.profile);
                }
            }
        })().catch(console.warn);
    }, [metadataFeed.store]);

    useEffect(() => {
        let notifications = notificationFeed.store.notes.filter(a => a.kind === EventKind.TextNote);

        if ("Notification" in window && Notification.permission === "granted") {
            for (let nx of notifications.filter(a => (a.created_at * 1000) > readNotifications)) {
                sendNotification(nx)
                    .catch(console.warn);
            }
        }

        dispatch(addNotifications(notifications));
    }, [notificationFeed.store]);

    useEffect(() => {
        let dms = dmsFeed.store.notes.filter(a => a.kind === EventKind.DirectMessage);
        dispatch(addDirectMessage(dms));
    }, [dmsFeed.store]);
}

async function makeNotification(ev: TaggedRawEvent) {
    switch (ev.kind) {
        case EventKind.TextNote: {
            const pubkeys = new Set([ev.pubkey, ...ev.tags.filter(a => a[0] === "p").map(a => a[1]!)]);
            const users = await db.bulkGet(Array.from(pubkeys))
            // @ts-ignore
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
