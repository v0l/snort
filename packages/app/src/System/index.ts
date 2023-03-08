import {
  AuthHandler,
  HexKey,
  TaggedRawEvent,
  Event as NEvent,
  EventKind,
  RelaySettings,
  Connection,
  Subscriptions,
  RawReqFilter,
} from "@snort/nostr";

import { ProfileCacheExpire } from "Const";
import { sanitizeRelayUrl, unixNowMs, unwrap } from "Util";
import { mapEventToProfile, MetadataCache } from "State/Users";
import { UserCache } from "State/Users/UserCache";
import { RequestBuilder } from "./RequestBuilder";
import { FlatNoteStore, NoteStore } from "./NoteCollection";
import { diffFilters } from "./RequestSplitter";

/**
 * Active or queued query on the system
 */
interface Query {
  started: number;
  id: string;
  filters: Array<RawReqFilter>;

  /**
   * Which relays this query has already been executed on
   */
  sentToRelays: Array<string>;

  /**
   * Which relays we want to send this query on
   */
  shouldSendTo: Array<string>;

  /**
   * If this query should be closed
   */
  closeRequested: boolean;
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
   * All active queries
   */
  Queries: Map<string, Query> = new Map();

  /**
   * Collection of all feeds which are keyed by subscription id
   */
  Feeds: Map<string, NoteStore> = new Map();

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
    this.#FetchMetadata();
  }

  /**
   * Connect to a NOSTR relay if not already connected
   */
  async ConnectToRelay(address: string, options: RelaySettings) {
    try {
      const addr = unwrap(sanitizeRelayUrl(address));
      if (!this.Sockets.has(addr)) {
        const c = new Connection(addr, options, this.HandleAuth);
        this.Sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        await c.Connect();
        for (const [, s] of this.Subscriptions) {
          c.AddSubscription(s);
        }
      } else {
        // update settings if already connected
        unwrap(this.Sockets.get(addr)).Settings = options;
      }
    } catch (e) {
      console.error(e);
    }
  }

  OnEvent(sub: string, ev: TaggedRawEvent) {
    const feed = this.Feeds.get(sub);
    if (feed) {
      feed.addNote(ev);
    }
  }

  /**
   *
   * @param address Relay address URL
   */
  async ConnectEphemeralRelay(address: string): Promise<Connection | undefined> {
    try {
      const addr = unwrap(sanitizeRelayUrl(address));
      if (!this.Sockets.has(addr)) {
        const c = new Connection(addr, { read: true, write: false }, this.HandleAuth, true);
        this.Sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        await c.Connect();
        for (const [, s] of this.Subscriptions) {
          c.AddSubscription(s);
        }
        return c;
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

  Query(req: RequestBuilder): Readonly<NoteStore> {
    /**
     * ## Notes
     *
     * Given a set of existing filters:
     * ["REQ", "1", { kinds: [0, 7], authors: [...], since: now()-1hr, until: now() }]
     * ["REQ", "2", { kinds: [0, 7], authors: [...], since: now(), limit: 0 }]
     *
     * ## Problem 1:
     * Assume we now want to update sub "1" with a new set of authors,
     * what should we do, should we close sub "1" and send the new set or create another
     * subscription with the new pubkeys (diff)
     *
     * Creating a new subscription sounds great but also is a problem when relays limit
     * active subscriptions, maybe we should instead queue the new
     * subscription (assuming that we expect to close at EOSE)
     *
     * ## Problem 2:
     * When multiple filters a specifid in a single filter but only 1 filter changes,
     * ~~same as above~~
     *
     * Seems reasonable to do "Queue Diff", should also be possible to collapse multiple
     * pending filters for the same subscription
     */

    const filters = req.build();
    if (this.Queries.has(req.id)) {
      const q = unwrap(this.Queries.get(req.id));
      const diff = diffFilters(q.filters, filters);
      if (JSON.stringify(filters) === JSON.stringify(diff)) {
        return unwrap(this.Feeds.get(req.id));
      } else {
        return this.AddQuery(req.id, filters);
      }
    } else {
      return this.AddQuery(req.id, filters);
    }
  }

  AddQuery(id: string, filters: Array<RawReqFilter>): NoteStore {
    const q = {
      started: unixNowMs(),
      id: id,
      filters: filters,
    } as Query;
    this.Queries.set(id, q);
    let store = this.Feeds.get(id);
    if (!store) {
      store = new FlatNoteStore();
      this.Feeds.set(id, store);
    }
    console.debug("Adding query: ", q.id, JSON.stringify(q.filters));
    this.SendQuery(q);
    return store;
  }

  CancelQuery(sub: string) {
    const q = this.Queries.get(sub);
    if (q) {
      q.closeRequested = true;
    }
  }

  SendQuery(q: Query) {
    for (const [, s] of this.Sockets) {
      s._SendJson(["REQ", q.id, ...q.filters]);
    }
  }

  async AddSubscription(sub: Subscriptions) {
    let noRelays = true;
    this.Subscriptions.set(sub.Id, sub);
    for (const [, s] of this.Sockets) {
      if (s.AddSubscription(sub)) {
        noRelays = false;
      }
    }

    if (noRelays && sub.Relays) {
      for (const r of sub.Relays) {
        if (!this.Sockets.has(r) && r) {
          const c = await this.ConnectEphemeralRelay(r);
          if (c) {
            c.AddSubscription(sub);
          }
        }
      }
    }
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
    const c = new Connection(address, { write: true, read: false }, this.HandleAuth, true);
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

  async #FetchMetadata() {
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
      sub.Relays = new Set([...this.Sockets.values()].filter(a => !a.Ephemeral).map(a => a.Address));
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

    setTimeout(() => this.#FetchMetadata(), 500);
  }
}

export const System = new NostrSystem();
