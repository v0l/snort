import { useEffect, useMemo, useState } from "react";
import { System } from "..";
import { Subscriptions } from "../nostr/Subscriptions";

/**
 * 
 * @param {Subscriptions} sub 
 * @param {any} opt 
 * @returns 
 */
export default function useSubscription(sub, opt) {
    const [notes, setNotes] = useState([]);

    const options = {
        leaveOpen: false,
        ...opt
    };

    useEffect(() => {
        if (sub) {
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

            if (!options.leaveOpen) {
                sub.OnEnd = (c) => {
                    c.RemoveSubscription(sub.Id);
                    if (sub.IsFinished()) {
                        System.RemoveSubscription(sub.Id);
                    }
                };
            }

            System.AddSubscription(sub);
            return () => {
                System.RemoveSubscription(sub.Id);
            };
        }
    }, [sub]);

    return { notes, sub };
}