import { useSelector } from "react-redux";

import { System } from "..";
import Event from "../nostr/Event";
import EventKind from "../nostr/EventKind";
import Tag from "../nostr/Tag";
import { bech32ToHex } from "../Util"

export default function useEventPublisher() {
    const pubKey = useSelector(s => s.login.publicKey);
    const privKey = useSelector(s => s.login.privateKey);
    const follows = useSelector(s => s.login.follows);
    const relays = useSelector(s => s.login.relays);
    const hasNip07 = 'nostr' in window;

    /**
     * 
     * @param {Event} ev 
     * @param {*} privKey 
     * @returns 
     */
    async function signEvent(ev) {
        if (hasNip07 && !privKey) {
            ev.Id = await ev.CreateId();
            let tmpEv = await barierNip07(() => window.nostr.signEvent(ev.ToObject()));
            return Event.FromObject(tmpEv);
        } else {
            await ev.Sign(privKey);
        }
        return ev;
    }


    function processMentions(ev, msg) {
        const replaceNpub = (match) => {
            const npub = match.slice(1);
            try {
              const hex = bech32ToHex(npub);
              const idx = ev.Tags.length;
              ev.Tags.push(new Tag(["p", hex], idx));
              return `#[${idx}]`
            } catch (error) {
              return match
            }
        }
        let content = msg.replace(/@npub[a-z0-9]+/g, replaceNpub)
        ev.Content = content;
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
            processMentions(ev, msg);
            return await signEvent(ev);
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

            let thread = replyTo.Thread;
            if (thread) {
                if (thread.Root) {
                    ev.Tags.push(new Tag(["e", thread.Root.Event, "", "root"], ev.Tags.length));
                } else {
                    ev.Tags.push(new Tag(["e", thread.ReplyTo.Event, "", "root"], ev.Tags.length));
                }
                ev.Tags.push(new Tag(["e", replyTo.Id, "", "reply"], ev.Tags.length));
                ev.Tags.push(new Tag(["p", replyTo.PubKey], ev.Tags.length));
                for (let pk of thread.PubKeys) {
                    if (pk === pubKey) {
                        continue; // dont tag self in replies
                    }
                    ev.Tags.push(new Tag(["p", pk], ev.Tags.length));
                }
            } else {
                ev.Tags.push(new Tag(["e", replyTo.Id, "", "reply"], 0));
                ev.Tags.push(new Tag(["p", replyTo.PubKey], 1));
            }
            processMentions(ev, msg);
            return await signEvent(ev);
        },
        react: async (evRef, content = "+") => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.Reaction;
            ev.Content = content;
            ev.Tags.push(new Tag(["e", evRef.Id], 0));
            ev.Tags.push(new Tag(["p", evRef.PubKey], 1));
            return await signEvent(ev);
        },
        saveRelays: async () => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.ContactList;
            ev.Content = JSON.stringify(relays);
            for (let pk of follows) {
                ev.Tags.push(new Tag(["p", pk]));
            }

            return await signEvent(ev);
        },
        addFollow: async (pkAdd) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.ContactList;
            ev.Content = JSON.stringify(relays);
            let temp = new Set(follows);
            if (Array.isArray(pkAdd)) {
                pkAdd.forEach(a => temp.add(a));
            } else {
                temp.add(pkAdd);
            }
            for (let pk of temp) {
                ev.Tags.push(new Tag(["p", pk]));
            }

            return await signEvent(ev);
        },
        removeFollow: async (pkRemove) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.ContactList;
            ev.Content = JSON.stringify(relays);
            for (let pk of follows) {
                if (pk === pkRemove) {
                    continue;
                }
                ev.Tags.push(new Tag(["p", pk]));
            }

            return await signEvent(ev);
        },
        delete: async (id) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.Deletion;
            ev.Content = "";
            ev.Tags.push(new Tag(["e", id]));
            return await signEvent(ev);
        },
        /**
         * Respot a note
         * @param {Event} note 
         * @returns 
         */
        repost: async (note) => {
            if (typeof note.Id !== "string") {
                throw "Must be parsed note in Event class";
            }
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.Repost;
            ev.Content = JSON.stringify(note.Original);
            ev.Tags.push(new Tag(["e", note.Id]));
            ev.Tags.push(new Tag(["p", note.PubKey]));
            return await signEvent(ev);
        },
        decryptDm: async (note) => {
            if (note.PubKey !== pubKey && !note.Tags.some(a => a.PubKey === pubKey)) {
                return "<CANT DECRYPT>";
            }
            try {
                let otherPubKey = note.PubKey === pubKey ? note.Tags.filter(a => a.Key === "p")[0].PubKey : note.PubKey;
                if (hasNip07 && !privKey) {
                    return await barierNip07(() => window.nostr.nip04.decrypt(otherPubKey, note.Content));
                } else if(privKey) {
                    await note.DecryptDm(privKey, otherPubKey);
                    return note.Content;
                }
            } catch (e) {
                console.error("Decyrption failed", e);
                return "<DECRYPTION FAILED>";
            }
            return "test";
        },
        sendDm: async (content, to) => {
            let ev = Event.ForPubKey(pubKey);
            ev.Kind = EventKind.DirectMessage;
            ev.Content = content;
            ev.Tags.push(new Tag(["p", to]));

            try {
                if (hasNip07 && !privKey) {
                    let cx = await barierNip07(() => window.nostr.nip04.encrypt(to, content));
                    ev.Content = cx;
                    return await signEvent(ev);
                } else if(privKey) {
                    await ev.EncryptDmForPubkey(to, privKey);
                    return await signEvent(ev);
                }
            } catch (e) {
                console.error("Encryption failed", e);
            }
        }
    }
}

let isNip07Busy = false;

const delay = (t) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, t);
    });
}

const barierNip07 = async (then) => {
    while (isNip07Busy) {
        await delay(10);
    }
    isNip07Busy = true;
    try {
        return await then();
    } finally {
        isNip07Busy = false;
    }
};