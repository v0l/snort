import { HexKey, TaggedRawEvent, UserMetadata } from "./index";
import { ProfileCacheExpire } from "./Const";
import Connection, { RelaySettings } from "./Connection";
import Event from "./Event";
import EventKind from "./EventKind";
import { Subscriptions } from "./Subscriptions";
import { hexToBech32, unwrap } from "./Util";

// TODO This interface is repeated in State/Users, revisit this.
export interface MetadataCache extends UserMetadata {
  /**
   * When the object was saved in cache
   */
  loaded: number;

  /**
   * When the source metadata event was created
   */
  created: number;

  /**
   * The pubkey of the owner of this metadata
   */
  pubkey: HexKey;

  /**
   * The bech32 encoded pubkey
   */
  npub: string;
}

// TODO This interface is repeated in State/Users, revisit this.
export interface UsersDb {
  isAvailable(): Promise<boolean>;
  query(str: string): Promise<MetadataCache[]>;
  find(key: HexKey): Promise<MetadataCache | undefined>;
  add(user: MetadataCache): Promise<void>;
  put(user: MetadataCache): Promise<void>;
  bulkAdd(users: MetadataCache[]): Promise<void>;
  bulkGet(keys: HexKey[]): Promise<MetadataCache[]>;
  bulkPut(users: MetadataCache[]): Promise<void>;
  update(key: HexKey, fields: Record<string, string | number>): Promise<void>;
}

/**
 * Manages nostr content retrieval system
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

  /**
   * User db store
   */
  UserDb?: UsersDb;

  constructor() {
    this.Sockets = new Map();
    this.Subscriptions = new Map();
    this.PendingSubscriptions = [];
    this.WantsMetadata = new Set();
    this._FetchMetadata();
  }

  /**
   * Connect to a NOSTR relay if not already connected
   */
  ConnectToRelay(address: string, options: RelaySettings) {
    try {
      if (!this.Sockets.has(address)) {
        const c = new Connection(address, options);
        this.Sockets.set(address, c);
        for (const [, s] of this.Subscriptions) {
          c.AddSubscription(s);
        }
      } else {
        // update settings if already connected
        unwrap(this.Sockets.get(address)).Settings = options;
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Disconnect from a relay
   */
  DisconnectRelay(address: string) {
    const c = this.Sockets.get(address);
    if (c) {
      this.Sockets.delete(address);
      c.Close();
    }
  }

  AddSubscriptionToRelay(sub: Subscriptions, relay: string) {
    this.Sockets.get(relay)?.AddSubscription(sub);
  }

  AddSubscription(sub: Subscriptions) {
    for (const [, s] of this.Sockets) {
      s.AddSubscription(sub);
    }
    this.Subscriptions.set(sub.Id, sub);
  }

  RemoveSubscription(subId: string) {
    for (const [, s] of this.Sockets) {
      s.RemoveSubscription(subId);
    }
    this.Subscriptions.delete(subId);
  }

  /**
   * Send events to writable relays
   */
  BroadcastEvent(ev: Event) {
    for (const [, s] of this.Sockets) {
      s.SendEvent(ev);
    }
  }

  /**
   * Write an event to a relay then disconnect
   */
  async WriteOnceToRelay(address: string, ev: Event) {
    const c = new Connection(address, { write: true, read: false });
    await c.SendAsync(ev);
    c.Close();
  }

  /**
   * Request profile metadata for a set of pubkeys
   */
  TrackMetadata(pk: HexKey | Array<HexKey>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (p.length > 0) {
        this.WantsMetadata.add(p);
      }
    }
  }

  /**
   * Stop tracking metadata for a set of pubkeys
   */
  UntrackMetadata(pk: HexKey | Array<HexKey>) {
    for (const p of Array.isArray(pk) ? pk : [pk]) {
      if (p.length > 0) {
        this.WantsMetadata.delete(p);
      }
    }
  }

  /**
   * Request/Response pattern
   */
  RequestSubscription(sub: Subscriptions) {
    return new Promise<TaggedRawEvent[]>((resolve) => {
      const events: TaggedRawEvent[] = [];

      // force timeout returning current results
      const timeout = setTimeout(() => {
        this.RemoveSubscription(sub.Id);
        resolve(events);
      }, 10_000);

      const onEventPassthrough = sub.OnEvent;
      sub.OnEvent = (ev) => {
        if (typeof onEventPassthrough === "function") {
          onEventPassthrough(ev);
        }
        if (!events.some((a) => a.id === ev.id)) {
          events.push(ev);
        } else {
          const existing = events.find((a) => a.id === ev.id);
          if (existing) {
            for (const v of ev.relays) {
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
    if (this.UserDb) {
      const missing = new Set<HexKey>();
      const meta = await this.UserDb.bulkGet(Array.from(this.WantsMetadata));
      const expire = new Date().getTime() - ProfileCacheExpire;
      for (const pk of this.WantsMetadata) {
        const m = meta.find((a) => a?.pubkey === pk);
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

        const sub = new Subscriptions();
        sub.Id = `profiles:${sub.Id.slice(0, 8)}`;
        sub.Kinds = new Set([EventKind.SetMetadata]);
        sub.Authors = missing;
        sub.OnEvent = async (e) => {
          const profile = mapEventToProfile(e);
          const userDb = unwrap(this.UserDb);
          if (profile) {
            const existing = await userDb.find(profile.pubkey);
            if ((existing?.created ?? 0) < profile.created) {
              await userDb.put(profile);
            } else if (existing) {
              await userDb.update(profile.pubkey, {
                loaded: profile.loaded,
              });
            }
          }
        };
        const results = await this.RequestSubscription(sub);
        const couldNotFetch = Array.from(missing).filter(
          (a) => !results.some((b) => b.pubkey === a)
        );
        console.debug("No profiles: ", couldNotFetch);
        if (couldNotFetch.length > 0) {
          const updates = couldNotFetch
            .map((a) => {
              return {
                pubkey: a,
                loaded: new Date().getTime(),
              };
            })
            .map((a) => unwrap(this.UserDb).update(a.pubkey, a));
          await Promise.all(updates);
        }
      }
    }
    setTimeout(() => this._FetchMetadata(), 500);
  }

  nip42Auth: (challenge: string, relay: string) => Promise<Event | undefined> =
    async () => undefined;
}

function mapEventToProfile(ev: TaggedRawEvent) {
  try {
    const data: UserMetadata = JSON.parse(ev.content);
    return {
      pubkey: ev.pubkey,
      npub: hexToBech32("npub", ev.pubkey),
      created: ev.created_at,
      loaded: new Date().getTime(),
      ...data,
    } as MetadataCache;
  } catch (e) {
    console.error("Failed to parse JSON", ev, e);
  }
}

export const System = new NostrSystem();
