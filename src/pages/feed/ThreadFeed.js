import { useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { NostrContext } from "../..";
import { Subscriptions } from "../../nostr/Subscriptions";
import { addPubKey } from "../../state/Users";

export default function useThreadFeed(id) {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    const [note, setNote] = useState(null);
    const [notes, setNotes] = useState([]);
    const [relatedEvents, setRelatedEvents] = useState([]);

    useEffect(() => {
        if (note) {
            let eFetch = [];
            dispatch(addPubKey(note.pubkey));
            for (let t of note.tags) {
                if (t[0] === "p") {
                    dispatch(addPubKey(t[1]));
                } else if (t[0] === "e") {
                    eFetch.push(t[1]);
                }
            }
            if(eFetch.length > 0) {
                setRelatedEvents(eFetch);
            }
        }
    }, [note]);

    useEffect(() => {
        if (system) {
            let sub = new Subscriptions();
            sub.Ids.add(id);
            
            sub.OnEvent = (e) => {
                if(e.id === id && !note) {
                    setNote(e);
                }
            };
            system.AddSubscription(sub);
            return () => system.RemoveSubscription(sub.Id);
        }
    }, [system]);

    useEffect(() => {
        if(system && relatedEvents.length > 0) {
            let sub = new Subscriptions();
            sub.ETags = new Set(relatedEvents);
            sub.OnEvent = (e) => {
                let temp = new Set(notes);
                temp.add(e);
                setNotes(Array.from(temp));
            };
            system.AddSubscription(sub);
            return () => system.RemoveSubscription(sub.Id);
        }
    }, [system, relatedEvents])

    return { note, notes };

}