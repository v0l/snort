import { useEffect, useMemo, useState } from "react";
import { HexKey, u256 } from "../nostr";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { unixNow } from "../Util";
import useSubscription from "./Subscription";

export interface TimelineFeedOptions {
    global: boolean,
    method: "TIME_RANGE" | "LIMIT_UNTIL"
}

export default function useTimelineFeed(pubKeys: HexKey | Array<HexKey>, options: TimelineFeedOptions) {
    const now = unixNow();
    const [window, setWindow] = useState<number>(60 * 60);
    const [until, setUntil] = useState<number>(now);
    const [since, setSince] = useState<number>(now - window);
    const [trackingEvents, setTrackingEvent] = useState<u256[]>([]);

    const subTab = options.global ? "global" : "follows";
    const sub = useMemo(() => {
        if (!Array.isArray(pubKeys)) {
            pubKeys = [pubKeys];
        }

        if (!options.global && (!pubKeys || pubKeys.length === 0)) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `timeline:${subTab}`;
        sub.Authors = options.global ? undefined : new Set(pubKeys);
        sub.Kinds = new Set([EventKind.TextNote, EventKind.Repost]);
        if (options.method === "LIMIT_UNTIL") {
            sub.Until = until;
            sub.Limit = 10;
        } else {
            sub.Since = since;
            sub.Until = until;
            if (since === undefined) {
                sub.Limit = 50;
            }
        }

        return sub;
    }, [pubKeys, until, since, window]);

    const main = useSubscription(sub, { leaveOpen: true });

    const subNext = useMemo(() => {
        if (trackingEvents.length > 0) {
            let sub = new Subscriptions();
            sub.Id = `timeline-related:${subTab}`;
            sub.Kinds = new Set([EventKind.Reaction, EventKind.Deletion, EventKind.Repost]);
            sub.ETags = new Set(trackingEvents);
            return sub;
        }
        return null;
    }, [trackingEvents]);

    const others = useSubscription(subNext, { leaveOpen: true });

    useEffect(() => {
        if (main.notes.length > 0) {
            setTrackingEvent(s => {
                let ids = main.notes.map(a => a.id);
                let temp = new Set([...s, ...ids]);
                return Array.from(temp);
            });
        }
    }, [main.notes]);

    return {
        main: main.notes,
        others: others.notes,
        loadMore: () => {
            if (options.method === "LIMIT_UNTIL") {
                let oldest = main.notes.reduce((acc, v) => acc = v.created_at < acc ? v.created_at : acc, unixNow());
                setUntil(oldest);
            } else {
                setUntil(s => s - window);
                setSince(s => s - window);
            }
        }
    };
}