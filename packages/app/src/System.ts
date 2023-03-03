import {
  AuthHandler,
  HexKey,
  TaggedRawEvent,
  Event as NEvent,
  EventKind,
  RelaySettings,
  Connection,
  Subscriptions,
} from "@snort/nostr";

import { ProfileCacheExpire } from "Const";
import { mapEventToProfile, MetadataCache } from "State/Users";
import { UserCache } from "State/Users/UserCache";
import { unixNowMs, unwrap } from "Util";

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
   * Handler function for NIP-42
   */
  HandleAuth?: AuthHandler;

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
  async ConnectToRelay(address: string, options: RelaySettings) {
    try {
      if (!this.Sockets.has(address)) {
        const c = new Connection(address, options, this.HandleAuth);
        await c.Connect();
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
  BroadcastEvent(ev: NEvent) {
    for (const [, s] of this.Sockets) {
      s.SendEvent(ev);
    }
  }

  /**
   * Write an event to a relay then disconnect
   */
  async WriteOnceToRelay(address: string, ev: NEvent) {
    const c = new Connection(address, { write: true, read: false }, this.HandleAuth);
    await c.Connect();
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
  RequestSubscription(sub: Subscriptions, timeout?: number) {
    return new Promise<TaggedRawEvent[]>(resolve => {
      const events: TaggedRawEvent[] = [];

      // force timeout returning current results
      const t = setTimeout(() => {
        this.RemoveSubscription(sub.Id);
        resolve(events);
      }, timeout ?? 10_000);

      const onEventPassthrough = sub.OnEvent;
      sub.OnEvent = ev => {
        if (typeof onEventPassthrough === "function") {
          onEventPassthrough(ev);
        }
        if (!events.some(a => a.id === ev.id)) {
          events.push(ev);
        } else {
          const existing = events.find(a => a.id === ev.id);
          if (existing) {
            for (const v of ev.relays) {
              existing.relays.push(v);
            }
          }
        }
      };
      sub.OnEnd = c => {
        c.RemoveSubscription(sub.Id);
        if (sub.IsFinished()) {
          clearInterval(t);
          console.debug(`[${sub.Id}] Finished`);
          resolve(events);
        }
      };
      this.AddSubscription(sub);
    });
  }

  async _FetchMetadata() {
    const missingFromCache = await UserCache.buffer([...this.WantsMetadata]);

    const expire = unixNowMs() - ProfileCacheExpire;
    const expired = [...this.WantsMetadata]
      .filter(a => !missingFromCache.includes(a))
      .filter(a => (UserCache.get(a)?.loaded ?? 0) < expire);
    const missing = new Set([...missingFromCache, ...expired]);
    if (missing.size > 0) {
      console.debug(`Wants profiles: ${missingFromCache.length} missing, ${expired.length} expired`);

      const sub = new Subscriptions();
      sub.Id = `profiles:${sub.Id.slice(0, 8)}`;
      sub.Kinds = new Set([EventKind.SetMetadata]);
      sub.Authors = missing;
      sub.OnEvent = async e => {
        const profile = mapEventToProfile(e);
        if (profile) {
          await UserCache.update(profile);
        }
      };
      const results = await this.RequestSubscription(sub, 5_000);
      const couldNotFetch = [...missing].filter(a => !results.some(b => b.pubkey === a));
      if (couldNotFetch.length > 0) {
        console.debug("No profiles: ", couldNotFetch);
        const empty = couldNotFetch.map(a =>
          UserCache.update({
            pubkey: a,
            loaded: unixNowMs(),
            created: 69,
          } as MetadataCache)
        );
        await Promise.all(empty);
      }
    }

    setTimeout(() => this._FetchMetadata(), 500);
  }
}

export const System = new NostrSystem();
