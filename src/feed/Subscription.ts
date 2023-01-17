import { useEffect, useMemo, useReducer, useState } from "react";
import { System } from "../nostr/System";
import { TaggedRawEvent } from "../nostr";
import { Subscriptions } from "../nostr/Subscriptions";

export type NoteStore = {
    notes: Array<TaggedRawEvent>
};

export type UseSubscriptionOptions = {
    leaveOpen: boolean
}

function notesReducer(state: NoteStore, ev: TaggedRawEvent) {
    if (state.notes.some(a => a.id === ev.id)) {
        return state;
    }

    return {
        notes: [
            ...state.notes,
            ev
        ]
    }
}

/**
 * 
 * @param {Subscriptions} sub 
 * @param {any} opt 
 * @returns 
 */
export default function useSubscription(sub: Subscriptions | null, options?: UseSubscriptionOptions) {
    const [state, dispatch] = useReducer(notesReducer, <NoteStore>{ notes: [] });
    const [debounce, setDebounce] = useState<number>(0);

    useEffect(() => {
        if (sub) {
            sub.OnEvent = (e) => {
                dispatch(e);
            };

            if (!(options?.leaveOpen ?? false)) {
                sub.OnEnd = (c) => {
                    c.RemoveSubscription(sub.Id);
                    if (sub.IsFinished()) {
                        System.RemoveSubscription(sub.Id);
                    }
                };
            }

            console.debug("Adding sub: ", sub.ToObject());
            System.AddSubscription(sub);
            return () => {
                console.debug("Removing sub: ", sub.ToObject());
                System.RemoveSubscription(sub.Id);
            };
        }
    }, [sub]);

    useEffect(() => {
        let t = setTimeout(() => {
            setDebounce(s => s += 1);
        }, 100);
        return () => clearTimeout(t);
    }, [state]);

    return useMemo(() => state, [debounce]);
}