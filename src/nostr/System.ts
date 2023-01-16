import { HexKey, TaggedRawEvent } from ".";
import { ProfileCacheExpire } from "../Const";
import { db } from "../db";
import { mapEventToProfile } from "../feed/UsersFeed";
import Connection, { RelaySettings } from "./Connection";
import Event from "./Event";
import EventKind from "./EventKind";
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

    /**
     * List of pubkeys to fetch metadata for
     */
    WantsMetadata: Set<HexKey>;

    constructor() {
        this.Sockets = new Map();
        this.Subscriptions = new Map();
        this.PendingSubscriptions = [];
        this.WantsMetadata = new Set();
        this._FetchMetadata()
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

    GetMetadata(pk: HexKey) {
        if (pk.length > 0) {
            this.WantsMetadata.add(pk);
        }
    }

    /**
     * Request/Response pattern
     */
    RequestSubscription(sub: Subscriptions) {
        return new Promise<TaggedRawEvent[]>((resolve, reject) => {
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

    async _FetchMetadata() {
        let missing = new Set<HexKey>();
        for (let pk of this.WantsMetadata) {
            let meta = await db.users.get(pk);
            let now = new Date().getTime();
            if (!meta || meta.loaded < now - ProfileCacheExpire) {
                missing.add(pk);
            } else {
                this.WantsMetadata.delete(pk);
            }
        }

        if (missing.size > 0) {
            console.debug("Wants: ", missing);
    
            let sub = new Subscriptions();
            sub.Id = `profiles:${sub.Id}`;
            sub.Kinds = new Set([EventKind.SetMetadata]);
            sub.Authors = missing;
            sub.OnEvent = (e) => {
                let profile = mapEventToProfile(e);
                if (profile) {
                    db.users.put(profile);
                }
            }
            await this.RequestSubscription(sub);
        }

        setTimeout(() => this._FetchMetadata(), 500);
    }
}

export const System = new NostrSystem();