import { useContext, useEffect, useState } from "react";
import { NostrContext } from "../../index";
import EventKind from "../../nostr/EventKind";
import { Subscriptions } from "../../nostr/Subscriptions";

export default function useTimelineFeed(pubKeys) {
    const system = useContext(NostrContext);
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        if (system && pubKeys.length > 0) {
            const sub = new Subscriptions();
            sub.Authors = new Set(pubKeys);
            sub.Kinds.add(EventKind.TextNote);
            sub.Limit = 10;

            sub.OnEvent = (e) => {
                setNotes(n => {
                    if (Array.isArray(n) && !n.some(a => a.id === e.id)) {
                        return [
                            ...n,
                            e
                        ]
                    } else {
                        return n;
                    }
                });
            };

            system.AddSubscription(sub);
            return () => {
                system.RemoveSubscription(sub.Id);
            };
        }
    }, [system, pubKeys]);

    return { notes };
}