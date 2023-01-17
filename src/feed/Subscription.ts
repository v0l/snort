import { useEffect, useMemo, useReducer, useState } from "react";
import { System } from "../nostr/System";
import { TaggedRawEvent } from "../nostr";
import { Subscriptions } from "../nostr/Subscriptions";

export type NoteStore = {
    notes: Array<TaggedRawEvent>,
    end: boolean
};

export type UseSubscriptionOptions = {
    leaveOpen: boolean
}

interface ReducerArg {
    type: "END" | "EVENT"
    ev?: TaggedRawEvent,
    end?: boolean
}

function notesReducer(state: NoteStore, arg: ReducerArg) {
    if (arg.type === "END") {
        state.end = arg.end!;
        return state;
    }

    let ev = arg.ev!;
    if (state.notes.some(a => a.id === ev.id)) {
        //state.notes.find(a => a.id == ev.id)?.relays?.push(ev.relays[0]);
        return state;
    }

    return {
        notes: [
            ...state.notes,
            ev
        ]
    } as NoteStore;
}

const initStore: NoteStore = {
    notes: [],
    end: false
};

/**
 * 
 * @param {Subscriptions} sub 
 * @param {any} opt 
 * @returns 
 */
export default function useSubscription(sub: Subscriptions | null, options?: UseSubscriptionOptions) {
    const [state, dispatch] = useReducer(notesReducer, initStore);
    const [debounce, setDebounce] = useState<number>(0);

    useEffect(() => {
        if (sub) {
            sub.OnEvent = (e) => {
                dispatch({
                    type: "EVENT",
                    ev: e
                });
            };

            sub.OnEnd = (c) => {
                if (!(options?.leaveOpen ?? false)) {
                    c.RemoveSubscription(sub.Id);
                    if (sub.IsFinished()) {
                        System.RemoveSubscription(sub.Id);
                    }
                }
                dispatch({
                    type: "END",
                    end: true
                });
            };

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