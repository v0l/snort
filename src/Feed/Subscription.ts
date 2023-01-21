import { useEffect, useMemo, useReducer, useState } from "react";
import { System } from "Nostr/System";
import { TaggedRawEvent } from "Nostr";
import { Subscriptions } from "Nostr/Subscriptions";

export type NoteStore = {
    notes: Array<TaggedRawEvent>,
    end: boolean
};

export type UseSubscriptionOptions = {
    leaveOpen: boolean
}

interface ReducerArg {
    type: "END" | "EVENT" | "CLEAR",
    ev?: TaggedRawEvent | Array<TaggedRawEvent>,
    end?: boolean
}

function notesReducer(state: NoteStore, arg: ReducerArg) {
    if (arg.type === "END") {
        return {
            notes: state.notes,
            end: arg.end!
        } as NoteStore;
    }

    if (arg.type === "CLEAR") {
        return {
            notes: [],
            end: state.end,
        } as NoteStore;
    }

    let evs = arg.ev!;
    if (!Array.isArray(evs)) {
        evs = [evs];
    }
    evs = evs.filter(a => !state.notes.some(b => b.id === a.id));
    if (evs.length === 0) {
        return state;
    }
    return {
        notes: [
            ...state.notes,
            ...evs
        ]
    } as NoteStore;
}

const initStore: NoteStore = {
    notes: [],
    end: false
};

export interface UseSubscriptionState {
    store: NoteStore,
    clear: () => void,
    append: (notes: TaggedRawEvent[]) => void
}

/**
 * 
 * @param {Subscriptions} sub 
 * @param {any} opt 
 * @returns 
 */
export default function useSubscription(sub: Subscriptions | null, options?: UseSubscriptionOptions): UseSubscriptionState {
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

    const stateDebounced = useMemo(() => state, [debounce]);
    return {
        store: stateDebounced,
        clear: () => {
            dispatch({ type: "CLEAR" });
        },
        append: (n: TaggedRawEvent[]) => {
            dispatch({
                type: "EVENT",
                ev: n
            });
        }
    }
}