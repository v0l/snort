import { useCallback, useMemo } from "react";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useTimelineFeed(pubKeys) {
    const sub = useMemo(() => {
        let sub = new Subscriptions();
        sub.Id = "timeline";
        sub.Authors = new Set(pubKeys);
        sub.Kinds.add(EventKind.TextNote);
        sub.Limit = 10;

        return sub;
    }, [pubKeys]);

    const { notes } = useSubscription(sub, { leaveOpen: true });
    return { notes };
}