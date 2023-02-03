import { useEffect, useMemo, useReducer, useState } from "react";
import { System } from "Nostr/System";
import { TaggedRawEvent } from "Nostr";
import { Subscriptions } from "Nostr/Subscriptions";
import { debounce } from "Util";
import { db } from "Db";

export type NoteStore = {
    notes: Array<TaggedRawEvent>,
    end: boolean
};

export type UseSubscriptionOptions = {
    leaveOpen: boolean,
    cache: boolean
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
    const useCache = useMemo(() => options?.cache === true, [options]);

    useEffect(() => {
        if (sub) {
            return debounce(DebounceMs, () => {
                setSubDebounced(sub);
            });
        }
    }, [sub, options]);

    useEffect(() => {
        if (subDebounce) {
            dispatch({
                type: "END",
                end: false
            });

            if (useCache) {
                // preload notes from db
                PreloadNotes(subDebounce.Id)
                    .then(ev => {
                        dispatch({
                            type: "EVENT",
                            ev: ev
                        });
                    })
                    .catch(console.warn);
            }
            subDebounce.OnEvent = (e) => {
                dispatch({
                    type: "EVENT",
                    ev: e
                });
                if (useCache) {
                    db.events.put(e);
                }
            };

            subDebounce.OnEnd = (c) => {
                if (!(options?.leaveOpen ?? false)) {
                    c.RemoveSubscription(subDebounce.Id);
                    if (subDebounce.IsFinished()) {
                        System.RemoveSubscription(subDebounce.Id);
                    }
                }
                dispatch({
                    type: "END",
                    end: true
                });
            };

            console.debug("Adding sub: ", subDebounce.ToObject());
            System.AddSubscription(subDebounce);
            return () => {
                console.debug("Removing sub: ", subDebounce.ToObject());
                System.RemoveSubscription(subDebounce.Id);
            };
        }
    }, [subDebounce, useCache]);

    useEffect(() => {
        if (subDebounce && useCache) {
            return debounce(500, () => {
                TrackNotesInFeed(subDebounce.Id, state.notes)
                    .catch(console.warn);
            });
        }
    }, [state, useCache]);

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

/**
 * Lookup cached copy of feed
 */
const PreloadNotes = async (id: string): Promise<TaggedRawEvent[]> => {
    const feed = await db.feeds.get(id);
    if (feed) {
        const events = await db.events.bulkGet(feed.ids);
        return events.filter(a => a !== undefined).map(a => a!);
    }
    return [];
}

const TrackNotesInFeed = async (id: string, notes: TaggedRawEvent[]) => {
    const existing = await db.feeds.get(id);
    const ids = Array.from(new Set([...(existing?.ids || []), ...notes.map(a => a.id)]));
    const since = notes.reduce((acc, v) => acc > v.created_at ? v.created_at : acc, +Infinity);
    const until = notes.reduce((acc, v) => acc < v.created_at ? v.created_at : acc, -Infinity);
    await db.feeds.put({ id, ids, since, until });
}