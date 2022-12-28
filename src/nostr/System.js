import { useSelector } from "react-redux";
import Connection from "./Connection";

/**
 * Manages nostr content retrival system
 */
export class NostrSystem {
    constructor() {
        this.Sockets = {};
        this.Subscriptions = {};
        this.PendingSubscriptions = [];
    }

    /**
     * Connect to a NOSTR relay if not already connected
     * @param {string} address 
     */
    ConnectToRelay(address) {
        if (typeof this.Sockets[address] === "undefined") {
            let c = new Connection(address);
            for (let s of Object.values(this.Subscriptions)) {
                c.AddSubscription(s);
            }
            this.Sockets[address] = c;
        }
    }

    AddSubscription(sub) {
        for (let s of Object.values(this.Sockets)) {
            s.AddSubscription(sub);
        }
        this.Subscriptions[sub.Id] = sub;
    }

    RemoveSubscription(subId) {
        for (let s of Object.values(this.Sockets)) {
            s.RemoveSubscription(subId);
        }
        delete this.Subscriptions[subId];
    }

    /**
     * Send events to writable relays
     * @param {Event} ev 
     */
    BroadcastEvent(ev) {
        for (let s of Object.values(this.Sockets)) {
            s.SendEvent(ev);
        }
    }

    /**
     * Request/Response pattern 
     * @param {Subscriptions} sub 
     * @returns {Array<any>}
     */
    RequestSubscription(sub) {
        return new Promise((resolve, reject) => {
            let events = [];

            // force timeout returning current results
            let timeout = setTimeout(() => {
                this.RemoveSubscription(sub.Id);
                resolve(events);
            }, 10_000);

            let onEventPassthrough = sub.OnEvent;
            sub.OnEvent = (ev) => {
                if (typeof onEventPassthrough === "function") {
                    onEventPassthrough(ev);
                }
                if (!events.some(a => a.id === ev.id)) {
                    events.push(ev);
                }
            };
            sub.OnEnd = (c) => {
                c.RemoveSubscription(sub.Id);
                if (sub.IsFinished()) {
                    clearInterval(timeout);
                    console.debug(`[${sub.Id}] Finished`);
                    resolve(events);
                }
            };
            this.AddSubscription(sub);
        });
    }
}