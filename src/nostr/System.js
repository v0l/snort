import { useSelector } from "react-redux";
import Connection from "./Connection";

/**
 * Manages nostr content retrival system
 */
export class NostrSystem {
    constructor() {
        this.Sockets = {};
        this.Subscriptions = {};
    }

    /**
     * Connect to a NOSTR relay if not already connected
     * @param {string} address 
     */
    ConnectToRelay(address) {
        if(typeof this.Sockets[address] === "undefined") {
            let c = new Connection(address);
            for(let s of Object.values(this.Subscriptions)) {
                c.AddSubscription(s);
            }
            this.Sockets[address] = c;
        }
    }

    AddSubscription(sub) {
        for(let s of Object.values(this.Sockets)) {
            s.AddSubscription(sub);
        }
        this.Subscriptions[sub.Id] = sub;
    }

    RemoveSubscription(subId) {
        for(let s of Object.values(this.Sockets)) {
            s.RemoveSubscription(subId);
        }
        delete this.Subscriptions[subId];
    }

    BroadcastEvent(ev) {
        for(let s of Object.values(this.Sockets)) {
            s.SendEvent(ev);
        }
    }
}