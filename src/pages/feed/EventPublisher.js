import { useContext } from "react";
import { useSelector } from "react-redux";
import { NostrContext } from "../..";
import Event from "../../nostr/Event";
import EventKind from "../../nostr/EventKind";
import Tag from "../../nostr/Tag";

export default function useEventPublisher() {
    const system = useContext(NostrContext);
    const pubKey = useSelector(s => s.login.publicKey);
    const privKey = useSelector(s => s.login.privateKey);

    return {
        broadcast: (ev) => {
            console.debug("Sending event: ", ev);
            system.BroadcastEvent(ev);
        },
        metadata: async (obj) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.SetMetadata;
            ev.Content = JSON.stringify(obj);
            await ev.Sign(privKey);
            return ev;
        },
        note: async (msg) => {
            if(typeof msg !== "string") {
                throw "Must be text!";
            }
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.TextNote;
            ev.Content = msg;
            await ev.Sign(privKey);
            return ev;
        },
        like: async (evRef) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.Reaction;
            ev.Content = "+";
            ev.Tags.push(new Tag(["e", evRef.Id], 0));
            ev.Tags.push(new Tag(["p", evRef.PubKey], 1));
            await ev.Sign(privKey);
            return ev;
        },
        dislike: async (evRef) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.Reaction;
            ev.Content = "-";
            ev.Tags.push(new Tag(["e", evRef.Id], 0));
            ev.Tags.push(new Tag(["p", evRef.PubKey], 1));
            await ev.Sign(privKey);
            return ev;
        }
    }
}