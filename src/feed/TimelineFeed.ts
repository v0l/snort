import { useEffect, useMemo, useState } from "react";
import { HexKey, u256 } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import useSubscription from "./Subscription";

export default function useTimelineFeed(pubKeys: HexKey | Array<HexKey>, global: boolean = false) {
    const [until, setUntil] = useState<number>();
    const [trackingEvents, setTrackingEvent] = useState<u256[]>([]);

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
        sub.Until = until;

        return sub;
    }, [pubKeys, global, until]);

    const main = useSubscription(sub, { leaveOpen: true });

    const subNext = useMemo(() => {
        if (trackingEvents.length > 0) {
            let sub = new Subscriptions();
            sub.Id = `timeline-related:${subTab}`;
            sub.Kinds = new Set([EventKind.Reaction, EventKind.Deletion, EventKind.Repost, EventKind.Zap]);
            sub.ETags = new Set(trackingEvents);
            return sub;
        }
        return null;
    }, [trackingEvents]);

    const others = useSubscription(subNext, { leaveOpen: true });

    useEffect(() => {
        if (main.notes.length > 0) {
            // debounce
            let t = setTimeout(() => {
                setTrackingEvent(s => {
                    let ids = main.notes.map(a => a.id);
                    let temp = new Set([...s, ...ids]);
                    return Array.from(temp);
                });
            }, 200);
            return () => clearTimeout(t);
        }
    }, [main.notes]);

    return {
        main: main.notes,
        others: others.notes,
        loadMore: () => {
            let now = Math.floor(new Date().getTime() / 1000);
            let oldest = main.notes.reduce((acc, v) => acc = v.created_at < acc ? v.created_at : acc, now);
            setUntil(oldest);
        },
        until
    };
}