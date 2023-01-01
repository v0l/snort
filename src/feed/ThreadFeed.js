import { useMemo } from "react";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useThreadFeed(id) {
    const sub = useMemo(() => {
        const thisSub = new Subscriptions();
        thisSub.Id = `thread:${thisSub.Id}`;
        thisSub.Ids.add(id);

        // get replies to this event
        const subRelated = new Subscriptions();
        subRelated.Kinds.add(EventKind.Reaction);
        subRelated.Kinds.add(EventKind.TextNote);
        subRelated.ETags = thisSub.Ids;
        thisSub.AddSubscription(subRelated);

        return thisSub;
    }, [id]);

    const main = useSubscription(sub, { leaveOpen: true });

    const relatedThisSub = useMemo(() => {
        let thisNote = main.notes.find(a => a.id === id);

        if (thisNote) {
            let otherSubs = new Subscriptions();
            otherSubs.Id = `thread-related:${otherSubs.Id}`;
            for (let e of thisNote.tags.filter(a => a[0] === "e")) {
                otherSubs.Ids.add(e[1]);
            }
            // no #e skip related
            if (otherSubs.Ids.size === 0) {
                return null;
            }

            let relatedSubs = new Subscriptions();
            relatedSubs.Kinds.add(EventKind.Reaction);
            relatedSubs.Kinds.add(EventKind.TextNote);
            relatedSubs.ETags = otherSubs.Ids;

            otherSubs.AddSubscription(relatedSubs);
            return otherSubs;
        }
    }, [main.notes]);

    const others = useSubscription(relatedThisSub, { leaveOpen: true });

    return {
        main: main.notes,
        other: others.notes
    };
}