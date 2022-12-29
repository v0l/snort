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
    const nip07 = useSelector(s => s.login.nip07);
    const hasNip07 = 'nostr' in window;

    /**
     * 
     * @param {Event} ev 
     * @param {*} privKey 
     * @returns 
     */
    async function signEvent(ev, privKey) {
        if(nip07 === true && hasNip07) {
            ev.Id = await ev.CreateId();
            let tmpEv = await window.nostr.signEvent(ev.ToObject());
            console.log(tmpEv);
            return Event.FromObject(tmpEv);
        } else {
            await ev.Sign(privKey);
        }
        return ev;
    }

    return {
        broadcast: (ev) => {
            console.debug("Sending event: ", ev);
            system.BroadcastEvent(ev);
        },
        metadata: async (obj) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.SetMetadata;
            ev.Content = JSON.stringify(obj);
            return await signEvent(ev, privKey);
        },
        note: async (msg) => {
            if(typeof msg !== "string") {
                throw "Must be text!";
            }
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.TextNote;
            ev.Content = msg;
            return await signEvent(ev, privKey);
        },
        like: async (evRef) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.Reaction;
            ev.Content = "+";
            ev.Tags.push(new Tag(["e", evRef.Id], 0));
            ev.Tags.push(new Tag(["p", evRef.PubKey], 1));
            return await signEvent(ev, privKey);
        },
        dislike: async (evRef) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.Reaction;
            ev.Content = "-";
            ev.Tags.push(new Tag(["e", evRef.Id], 0));
            ev.Tags.push(new Tag(["p", evRef.PubKey], 1));
            return await signEvent(ev, privKey);
        }
    }
}