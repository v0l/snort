import { useEffect, useMemo, useState } from "react";
import { u256 } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import useSubscription from "Feed/Subscription";
import { useSelector } from "react-redux";
import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";

export default function useThreadFeed(id: u256) {
    const [trackingEvents, setTrackingEvent] = useState<u256[]>([id]);
    const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

    function addId(id: u256[]) {
        setTrackingEvent((s) => {
            let tmp = new Set([...s, ...id]);
            return Array.from(tmp);
        })
    }

    const sub = useMemo(() => {
        const thisSub = new Subscriptions();
        thisSub.Id = `thread:${id.substring(0, 8)}`;
        thisSub.Ids = new Set(trackingEvents);

        // get replies to this event
        const subRelated = new Subscriptions();
        subRelated.Kinds = new Set(pref.enableReactions ? [EventKind.Reaction, EventKind.TextNote, EventKind.Deletion, EventKind.Repost] : [EventKind.TextNote]);
        subRelated.ETags = thisSub.Ids;
        thisSub.AddSubscription(subRelated);

        return thisSub;
    }, [trackingEvents]);

    const main = useSubscription(sub, { leaveOpen: true });

    useEffect(() => {
        // debounce
        let t = setTimeout(() => {
            let eTags = main.notes.map(a => a.tags.filter(b => b[0] === "e").map(b => b[1])).flat();
            let ids = main.notes.map(a => a.id);
            let allEvents = new Set([...eTags, ...ids]);
            addId(Array.from(allEvents));
        }, 200);
        return () => clearTimeout(t);
    }, [main.notes]);

    return main;
}