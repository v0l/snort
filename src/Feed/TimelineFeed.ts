import { useEffect, useMemo, useState } from "react";
import { u256 } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import { unixNow } from "Util";
import useSubscription from "Feed/Subscription";
import { useSelector } from "react-redux";
import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";

export interface TimelineFeedOptions {
    method: "TIME_RANGE" | "LIMIT_UNTIL"
}

export interface TimelineSubject {
    type: "pubkey" | "hashtag" | "global" | "ptag",
    items: string[]
}

export default function useTimelineFeed(subject: TimelineSubject, options: TimelineFeedOptions) {
    const now = unixNow();
    const [window, setWindow] = useState<number>(60 * 60);
    const [until, setUntil] = useState<number>(now);
    const [since, setSince] = useState<number>(now - window);
    const [trackingEvents, setTrackingEvent] = useState<u256[]>([]);
    const [trackingParentEvents, setTrackingParentEvents] = useState<u256[]>([]);
    const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

    function createSub() {
        if (subject.type !== "global" && subject.items.length == 0) {
            return null;
        }

        let sub = new Subscriptions();
        sub.Id = `timeline:${subject.type}`;
        sub.Kinds = new Set([EventKind.TextNote, EventKind.Repost]);
        switch (subject.type) {
            case "pubkey": {
                sub.Authors = new Set(subject.items);
                break;
            }
            case "hashtag": {
                sub.HashTags = new Set(subject.items);
                break;
            }
            case "ptag": {
                sub.PTags = new Set(subject.items);
                break;
            }
        }
        return sub;
    }

    const sub = useMemo(() => {
        let sub = createSub();
        if (sub) {
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

            if (pref.autoShowLatest) {
                // copy properties of main sub but with limit 0
                // this will put latest directly into main feed
                let latestSub = new Subscriptions();
                latestSub.Authors = sub.Authors;
                latestSub.HashTags = sub.HashTags;
                latestSub.Kinds = sub.Kinds;
                latestSub.Limit = 1;
                latestSub.Since = Math.floor(new Date().getTime() / 1000);
                sub.AddSubscription(latestSub);
            }
        }
        return sub;
    }, [subject.type, subject.items, until, since, window]);

    const main = useSubscription(sub, { leaveOpen: true });

    const subRealtime = useMemo(() => {
        let subLatest = createSub();
        if (subLatest && !pref.autoShowLatest) {
            subLatest.Id = `${subLatest.Id}:latest`;
            subLatest.Limit = 1;
            subLatest.Since = Math.floor(new Date().getTime() / 1000);
        }
        return subLatest;
    }, [subject.type, subject.items]);

    const latest = useSubscription(subRealtime, { leaveOpen: true });

    const subNext = useMemo(() => {
        let sub: Subscriptions | undefined;
        if (trackingEvents.length > 0 && pref.enableReactions) {
            sub = new Subscriptions();
            sub.Id = `timeline-related:${subject.type}`;
            sub.Kinds = new Set([EventKind.Reaction, EventKind.Deletion]);
            sub.ETags = new Set(trackingEvents);
        }
        return sub ?? null;
    }, [trackingEvents]);

    const others = useSubscription(subNext, { leaveOpen: true });

    const subParents = useMemo(() => {
        if (trackingParentEvents.length > 0) {
            let parents = new Subscriptions();
            parents.Id = `timeline-parent:${subject.type}`;
            parents.Ids = new Set(trackingParentEvents);
            return parents;
        }
        return null;
    }, [trackingParentEvents]);

    const parent = useSubscription(subParents);

    useEffect(() => {
        if (main.store.notes.length > 0) {
            setTrackingEvent(s => {
                let ids = main.store.notes.map(a => a.id);
                let temp = new Set([...s, ...ids]);
                return Array.from(temp);
            });
            let reposts = main.store.notes
                .filter(a => a.kind === EventKind.Repost && a.content === "")
                .map(a => a.tags.find(b => b[0] === "e"))
                .filter(a => a)
                .map(a => a![1]);
            if (reposts.length > 0) {
                setTrackingParentEvents(s => {
                    if (reposts.some(a => !s.includes(a))) {
                        let temp = new Set([...s, ...reposts]);
                        return Array.from(temp);
                    }
                    return s;
                })
            }
        }
    }, [main.store]);

    return {
        main: main.store,
        related: others.store,
        latest: latest.store,
        parent: parent.store,
        loadMore: () => {
            console.debug("Timeline load more!")
            if (options.method === "LIMIT_UNTIL") {
                let oldest = main.store.notes.reduce((acc, v) => acc = v.created_at < acc ? v.created_at : acc, unixNow());
                setUntil(oldest);
            } else {
                setUntil(s => s - window);
                setSince(s => s - window);
            }
        },
        showLatest: () => {
            main.append(latest.store.notes);
            latest.clear();
        }
    };
}