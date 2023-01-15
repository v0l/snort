import { useMemo } from "react";
import { u256 } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useThreadFeed(id: u256) {
    const sub = useMemo(() => {
        const thisSub = new Subscriptions();
        thisSub.Id = `thread:${id.substring(0, 8)}`;
        thisSub.Ids = new Set([id]);

        // get replies to this event
        const subRelated = new Subscriptions();
        subRelated.Kinds = new Set([EventKind.Reaction, EventKind.TextNote, EventKind.Deletion]);
        subRelated.ETags = thisSub.Ids;
        thisSub.AddSubscription(subRelated);

        return thisSub;
    }, [id]);

    const main = useSubscription(sub, { leaveOpen: true });

    const relatedThisSub = useMemo(() => {
        let thisNote = main.notes.find(a => a.id === id);

        if (thisNote) {
            let otherSubs = new Subscriptions();
            otherSubs.Id = `thread-related:${id.substring(0, 8)}`;
            otherSubs.Ids = new Set();
            for (let e of thisNote.tags.filter(a => a[0] === "e")) {
                otherSubs.Ids.add(e[1]);
            }
            // no #e skip related
            if (otherSubs.Ids.size === 0) {
                return null;
            }

            let relatedSubs = new Subscriptions();
            relatedSubs.Kinds = new Set([EventKind.Reaction, EventKind.TextNote, EventKind.Deletion]);
            relatedSubs.ETags = otherSubs.Ids;

            otherSubs.AddSubscription(relatedSubs);
            return otherSubs;
        }
        return null;
    }, [main]);

    const others = useSubscription(relatedThisSub, { leaveOpen: true });

    return useMemo(() => {
        return {
            main: main.notes,
            other: others.notes,
        };
    }, [main, others]);
}