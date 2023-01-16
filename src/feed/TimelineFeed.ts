import { useMemo } from "react";
import { HexKey } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useTimelineFeed(pubKeys: HexKey | Array<HexKey>, global: boolean = false) {
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
        sub.Authors = global ? undefined : new Set(pubKeys);
        sub.Kinds = new Set([EventKind.TextNote, EventKind.Repost]);
        sub.Limit = 20;

        return sub;
    }, [pubKeys, global]);

    const main = useSubscription(sub, { leaveOpen: true });

    const subNext = useMemo(() => {
        return null; // TODO: spam
        if (main.notes.length > 0) {
            let sub = new Subscriptions();
            sub.Id = `timeline-related:${subTab}`;
            sub.Kinds = new Set([EventKind.Reaction, EventKind.Deletion]);
            sub.ETags = new Set(main.notes.map(a => a.id));

            return sub;
        }
    }, [main]);

    const others = useSubscription(subNext, { leaveOpen: true });

    return { main: main.notes, others: others.notes };
}