import { useEffect, useMemo, useReducer, useState } from "react";
import { System } from "Nostr/System";
import { TaggedRawEvent } from "Nostr";
import { Subscriptions } from "Nostr/Subscriptions";
import { debounce } from "Util";

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
    let existingIds = new Set(state.notes.map(a => a.id));
    evs = evs.filter(a => !existingIds.has(a.id));
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
 * Wait time before returning changed state
 */
const DebounceMs = 200;

/**
 * 
 * @param {Subscriptions} sub 
 * @param {any} opt 
 * @returns 
 */
export default function useSubscription(sub: Subscriptions | null, options?: UseSubscriptionOptions): UseSubscriptionState {
    const [state, dispatch] = useReducer(notesReducer, initStore);
    const [debounceOutput, setDebounceOutput] = useState<number>(0);
    const [subDebounce, setSubDebounced] = useState<Subscriptions>();

    useEffect(() => {
        if (sub) {
            return debounce(DebounceMs, () => {
                setSubDebounced(sub);
            });
        }
    }, [sub, options]);

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
    }, [subDebounce]);

    useEffect(() => {
        return debounce(DebounceMs, () => {
            setDebounceOutput(s => s += 1);
        });
    }, [state]);

    const stateDebounced = useMemo(() => state, [debounceOutput]);
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