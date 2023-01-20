import { HexKey, TaggedRawEvent } from "Nostr";
import { ProfileCacheExpire } from "Const";
import { db } from "Db";
import { mapEventToProfile, MetadataCache } from "Db/User";
import Connection, { RelaySettings } from "Nostr/Connection";
import Event from "Nostr/Event";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";

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

    /**
     * Request profile metadata for a set of pubkeys
     */
    TrackMetadata(pk: HexKey | Array<HexKey>) {
        for (let p of Array.isArray(pk) ? pk : [pk]) {
            if (p.length > 0) {
                this.WantsMetadata.add(p);
            }
        }
    }

    /**
     * Stop tracking metadata for a set of pubkeys
     */
    UntrackMetadata(pk: HexKey | Array<HexKey>) {
        for (let p of Array.isArray(pk) ? pk : [pk]) {
            if (p.length > 0) {
                this.WantsMetadata.delete(p);
            }
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
        let meta = await db.users.bulkGet(Array.from(this.WantsMetadata));
        let expire = new Date().getTime() - ProfileCacheExpire;
        for (let pk of this.WantsMetadata) {
            let m = meta.find(a => a?.pubkey === pk);
            if (!m || m.loaded < expire) {
                missing.add(pk);
                // cap 100 missing profiles
                if (missing.size >= 100) {
                    break;
                }
            }
        }

        if (missing.size > 0) {
            console.debug("Wants profiles: ", missing);

            let sub = new Subscriptions();
            sub.Id = `profiles:${sub.Id}`;
            sub.Kinds = new Set([EventKind.SetMetadata]);
            sub.Authors = missing;
            sub.OnEvent = async (e) => {
                let profile = mapEventToProfile(e);
                if (profile) {
                    let existing = await db.users.get(profile.pubkey);
                    if((existing?.created ?? 0) < profile.created) {
                        await db.users.put(profile);
                    } else if(existing) {
                        await db.users.update(profile.pubkey, { loaded: new Date().getTime() });
                    }
                }
            }
            let results = await this.RequestSubscription(sub);
            let couldNotFetch = Array.from(missing).filter(a => !results.some(b => b.pubkey === a));
            console.debug("No profiles: ", couldNotFetch);
            await db.users.bulkPut(couldNotFetch.map(a => {
                return {
                    pubkey: a,
                    loaded: new Date().getTime()
                } as MetadataCache;
            }));
        }

        setTimeout(() => this._FetchMetadata(), 500);
    }
}

export const System = new NostrSystem();