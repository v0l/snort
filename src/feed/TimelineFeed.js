import { useMemo } from "react";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useTimelineFeed(pubKeys) {
    const sub = useMemo(() => {
        if (!Array.isArray(pubKeys)) {
            pubKeys = [pubKeys];
        }

        if (!pubKeys || pubKeys.length === 0) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `timeline:${sub.Id}`;
        sub.Authors = new Set(pubKeys);
        sub.Kinds.add(EventKind.TextNote);
        sub.Limit = 20;

        return sub;
    }, [pubKeys]);

    const { notes } = useSubscription(sub, { leaveOpen: true });
    return { notes };
}