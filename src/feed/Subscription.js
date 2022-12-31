import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { System } from "..";
import { Subscriptions } from "../nostr/Subscriptions";

function notesReducer(state, ev) {
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
export default function useSubscription(sub, opt) {
    const [state, dispatch] = useReducer(notesReducer, { notes: [] });

    const options = {
        leaveOpen: false,
        ...opt
    };

    useEffect(() => {
        if (sub) {
            sub.OnEvent = (e) => {
                dispatch(e);
            };

            if (!options.leaveOpen) {
                sub.OnEnd = (c) => {
                    sub.OnEvent = () => {};
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

    return state;
}