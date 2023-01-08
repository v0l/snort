import { useMemo } from "react";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useTimelineFeed(pubKeys, global = false) {
    const subTab = global ? "global" : "follows";
    const sub = useMemo(() => {
        if (!Array.isArray(pubKeys)) {
            pubKeys = [pubKeys];
        }

        if (!global && (!pubKeys || pubKeys.length === 0)) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `timeline:${subTab}`;
        sub.Authors = new Set(global ? [] : pubKeys);
        sub.Kinds.add(EventKind.TextNote);
        sub.Kinds.add(EventKind.Repost);
        sub.Limit = 20;

        return sub;
    }, [pubKeys, global]);

    const main = useSubscription(sub, { leaveOpen: true });

    const subNext = useMemo(() => {
        return null; // TODO: spam
        if (main.notes.length > 0) {
            let sub = new Subscriptions();
            sub.Id = `timeline-related:${subTab}`;
            sub.Kinds.add(EventKind.Reaction);
            sub.Kinds.add(EventKind.Deletion);
            sub.ETags = new Set(main.notes.map(a => a.id));

            return sub;
        }
    }, [main]);

    const others = useSubscription(subNext, { leaveOpen: true });

    return { main: main.notes, others: others.notes };
}