import { useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NostrContext } from "../..";
import Event from "../../nostr/Event";
import EventKind from "../../nostr/EventKind";
import { Subscriptions } from "../../nostr/Subscriptions";
import { setFollows, setRelays } from "../../state/Login";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
    const dispatch = useDispatch();
    const system = useContext(NostrContext);
    const pubKey = useSelector(s => s.login.publicKey);

    useEffect(() => {
        if (system && pubKey) {
            let sub = new Subscriptions();
            sub.Authors.add(pubKey);
            sub.Kinds.add(EventKind.ContactList);
            sub.OnEvent = (e) => {
                let ev = Event.FromObject(e);
                if (ev.Content !== "") {
                    let relays = JSON.parse(ev.Content);
                    dispatch(setRelays(relays));
                }
                let pTags = ev.Tags.filter(a => a.Key === "p").map(a => a.PubKey);
                dispatch(setFollows(pTags));
            }
            system.AddSubscription(sub);
            return () => system.RemoveSubscription(sub.Id);
        }
    }, [system, pubKey]);

    return {};
}