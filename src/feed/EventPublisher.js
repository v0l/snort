import { useSelector } from "react-redux";
import { System } from "..";
import Event from "../nostr/Event";
import EventKind from "../nostr/EventKind";
import Tag from "../nostr/Tag";

export default function useEventPublisher() {
    const pubKey = useSelector(s => s.login.publicKey);
    const privKey = useSelector(s => s.login.privateKey);
    const nip07 = useSelector(s => s.login.nip07);
    const follows = useSelector(s => s.login.follows);
    const relays = useSelector(s => s.login.relays);
    const hasNip07 = 'nostr' in window;

    /**
     * 
     * @param {Event} ev 
     * @param {*} privKey 
     * @returns 
     */
    async function signEvent(ev, privKey) {
        if (nip07 === true && hasNip07) {
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
            System.BroadcastEvent(ev);
        },
        metadata: async (obj) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.SetMetadata;
            ev.Content = JSON.stringify(obj);
            return await signEvent(ev, privKey);
        },
        note: async (msg) => {
            if (typeof msg !== "string") {
                throw "Must be text!";
            }
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.TextNote;
            ev.Content = msg;
            return await signEvent(ev, privKey);
        },
        /**
         * Reply to a note
         * @param {Event} replyTo 
         * @param {String} msg 
         * @returns 
         */
        reply: async (replyTo, msg) => {
            if (typeof msg !== "string") {
                throw "Must be text!";
            }
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.TextNote;
            ev.Content = msg;

            let thread = replyTo.GetThread();
            if (thread) {
                if (thread.Root) {
                    ev.Tags.push(new Tag(["e", thread.Root.Event, "", "root"], ev.Tags.length));
                }
                if (thread.Reply) {
                    ev.Tags.push(new Tag(["e", thread.Reply.Id, "", "reply"], ev.Tags.length));
                }
                ev.Tags.push(new Tag(["p", replyTo.PubKey], ev.Tags.length));
                for (let pk of thread.PubKeys) {
                    ev.Tags.push(new Tag(["p", pk], ev.Tags.length));
                }
            } else {
                ev.Tags.push(new Tag(["e", replyTo.Id, "", "reply"], 0));
                ev.Tags.push(new Tag(["p", replyTo.PubKey], 1));
            }
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
        },
        addFollow: async (pubkey) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.ContactList;
            ev.Content = JSON.stringify(relays);
            for(let pk of follows) {
                ev.Tags.push(new Tag(["p", pk]));
            }
            ev.Tags.push(new Tag(["p", pubkey]));

            return await signEvent(ev, privKey);
        }
    }
}