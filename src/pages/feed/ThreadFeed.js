import { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NostrContext } from "../..";
import Event from "../../nostr/Event";
import { Subscriptions } from "../../nostr/Subscriptions";
import { addNote, reset } from "../../state/Thread";
import { addPubKey } from "../../state/Users";

export default function useThreadFeed(id) {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    const notes = useSelector(s => s.thread.notes);

    // track profiles
    useEffect(() => {
        for (let n of notes) {
            if (n.pubkey) {
                dispatch(addPubKey(n.pubkey));
            }
            for(let t of n.tags) {
                if(t[0] === "p" && t[1]) {
                    dispatch(addPubKey(t[1]));
                }
            }
        }
    }, [notes]);

    useEffect(() => {
        if (system) {
            let sub = new Subscriptions();
            if (notes.length === 1) {
                let thisNote = Event.FromObject(notes[0]);
                let thread = thisNote.GetThread();
                if (thread !== null) {
                    if (thread.ReplyTo) {
                        sub.Ids.add(thread.ReplyTo.Event);
                    }
                    if (thread.Root) {
                        sub.Ids.add(thread.Root.Event);
                    }
                    for (let m of thread.Mentions) {
                        sub.Ids.add(m.Event);
                    }
                }
            } else if (notes.length === 0) {
                sub.Ids.add(id);

                // get replies to this event
                let subRelated = new Subscriptions();
                subRelated.ETags.add(id);
                sub.AddSubscription(subRelated);
            } else {
                return;
            }
            sub.OnEvent = (e) => {
                dispatch(addNote(e));
            };
            sub.OnEnd = (c) => {
                c.RemoveSubscription(sub.Id);
            };
            system.AddSubscription(sub);
        }
    }, [system, notes]);

    useEffect(() => {
        dispatch(reset());
    }, []);

    return { notes };
}