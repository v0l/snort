import { useEffect, useReducer } from "react";
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

    return state;
}