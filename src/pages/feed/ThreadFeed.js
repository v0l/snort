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
    const [thisLoaded, setThisLoaded] = useState(false);

    // track profiles
    useEffect(() => {
        let keys = [];
        for (let n of notes) {
            if (n.pubkey) {
                keys.push(n.pubkey);
            }
            for (let t of n.tags) {
                if (t[0] === "p" && t[1]) {
                    keys.push(t[1]);
                }
            }
        }

        dispatch(addPubKey(keys));
    }, [notes]);

    useEffect(() => {
        if (system) {
            let sub = new Subscriptions();
            let thisNote = notes.find(a => a.id === id);
            if (thisNote && !thisLoaded) {
                console.debug(notes);
                setThisLoaded(true);
                
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
            } else {
                return;
            }

            // get replies to this event
            let subRelated = new Subscriptions();
            subRelated.ETags = sub.Ids;
            sub.AddSubscription(subRelated);

            sub.OnEvent = (e) => {
                dispatch(addNote(e));
            };
            system.AddSubscription(sub);
        }
    }, [system, notes]);

    useEffect(() => {
        console.debug("use thread stream")
        dispatch(reset());
    }, []);

    return { notes };
}