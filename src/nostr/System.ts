import { TaggedRawEvent } from ".";
import Connection, { RelaySettings } from "./Connection";
import Event from "./Event";
import { Subscriptions } from "./Subscriptions";

/**
 * Manages nostr content retrival system
 */
export class NostrSystem {
    /**
     * All currently connected websockets
     */
    Sockets: Map<string, Connection>;

    /**
     * All active subscriptions
     */
    Subscriptions: Map<string, Subscriptions>;

    /**
     * Pending subscriptions to send when sockets become open
     */
    PendingSubscriptions: Subscriptions[];

    constructor() {
        this.Sockets = new Map();
        this.Subscriptions = new Map();
        this.PendingSubscriptions = [];
    }

    /**
     * Connect to a NOSTR relay if not already connected
     */
    ConnectToRelay(address: string, options: RelaySettings) {
        try {
            if (!this.Sockets.has(address)) {
                let c = new Connection(address, options);
                this.Sockets.set(address, c);
                for (let [_, s] of this.Subscriptions) {
                    c.AddSubscription(s);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Disconnect from a relay
     */
    DisconnectRelay(address: string) {
        let c = this.Sockets.get(address);
        if (c) {
            this.Sockets.delete(address);
            c.Close();
        }
    }

    AddSubscription(sub: Subscriptions) {
        for (let [_, s] of this.Sockets) {
            s.AddSubscription(sub);
        }
        this.Subscriptions.set(sub.Id, sub);
    }

    RemoveSubscription(subId: string) {
        for (let [_, s] of this.Sockets) {
            s.RemoveSubscription(subId);
        }
        this.Subscriptions.delete(subId);
    }

    /**
     * Send events to writable relays
     */
    BroadcastEvent(ev: Event) {
        for (let [_, s] of this.Sockets) {
            s.SendEvent(ev);
        }
    }

    /**
     * Request/Response pattern
     */
    RequestSubscription(sub: Subscriptions) {
        return new Promise((resolve, reject) => {
            let events: TaggedRawEvent[] = [];

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
                } else {
                    let existing = events.find(a => a.id === ev.id);
                    if (existing) {
                        for (let v of ev.relays) {
                            existing.relays.push(v);
                        }
                    }
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

export const System = new NostrSystem();