import { useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NostrContext } from "../../index";
import EventKind from "../../nostr/EventKind";
import { Subscriptions } from "../../nostr/Subscriptions";
import { addNote } from "../../state/Timeline";
import { addPubKey } from "../../state/Users";

export default function useTimelineFeed(opt) {
    const system = useContext(NostrContext);
    const dispatch = useDispatch();
    const follows = useSelector(s => s.timeline?.follows);
    const notes = useSelector(s => s.timeline?.notes);
    const pubKeys = useSelector(s => s.users.pubKeys);

    const options = {

        ...opt
    };

    function trackPubKeys(keys) {
        for (let pk of keys) {
            if (!pubKeys.includes(pk)) {
                dispatch(addPubKey(pk));
            }
        }
    }

    useEffect(() => {
        if (follows.length > 0) {
            const sub = new Subscriptions();
            sub.Authors = new Set(follows);
            sub.Kinds.add(EventKind.TextNote);
            sub.Limit = 10;

            sub.OnEvent = (e) => {
                dispatch(addNote(e));
            };

            trackPubKeys(follows);
            if (system) {
                system.AddSubscription(sub);
                return () => system.RemoveSubscription(sub.Id);
            }
        }
    }, [follows]);

    useEffect(() => {
        for (let n of notes) {

        }
    }, [notes]);

    return { notes, follows };
}