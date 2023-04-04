import { AuthHandler, TaggedRawEvent, RelaySettings, Connection, RawReqFilter, RawEvent } from "@snort/nostr";

import { sanitizeRelayUrl, unixNowMs, unwrap } from "Util";
import { RequestBuilder } from "./RequestBuilder";
import {
  FlatNoteStore,
  NoteStore,
  PubkeyReplaceableNoteStore,
  ParameterizedReplaceableNoteStore,
} from "./NoteCollection";
import { diffFilters } from "./RequestSplitter";
import { Query } from "./Query";

export {
  NoteStore,
  RequestBuilder,
  FlatNoteStore,
  PubkeyReplaceableNoteStore,
  ParameterizedReplaceableNoteStore,
  Query,
};

export interface SystemSnapshot {
  queries: Array<{
    id: string;
    filters: Array<RawReqFilter>;
    subFilters: Array<RawReqFilter>;
    closing: boolean;
  }>;
}

export type HookSystemSnapshotRelease = () => void;
export type HookSystemSnapshot = () => void;

/**
 * Manages nostr content retrieval system
 */
export class NostrSystem {
  /**
   * All currently connected websockets
   */
  Sockets: Map<string, Connection>;

  /**
   * All active queries
   */
  Queries: Map<string, Query> = new Map();

  /**
   * Collection of all feeds which are keyed by subscription id
   */
  Feeds: Map<string, NoteStore> = new Map();

  /**
   * Handler function for NIP-42
   */
  HandleAuth?: AuthHandler;

  /**
   * State change hooks
   */
  #stateHooks: Array<HookSystemSnapshot> = [];

  /**
   * Current snapshot of the system
   */
  #snapshot: Readonly<SystemSnapshot> = { queries: [] };

  constructor() {
    this.Sockets = new Map();
    this.#cleanup();
  }

  hook(cb: HookSystemSnapshot): HookSystemSnapshotRelease {
    this.#stateHooks.push(cb);
    return () => {
      const idx = this.#stateHooks.findIndex(a => a === cb);
      this.#stateHooks.splice(idx, 1);
    };
  }

  getSnapshot(): Readonly<SystemSnapshot> {
    return this.#snapshot;
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
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnConnected = () => {
          for (const [, q] of this.Queries) {
            q.sendToRelay(c);
          }
        };
        await c.Connect();
      } else {
        // update settings if already connected
        unwrap(this.Sockets.get(addr)).Settings = options;
      }
    } catch (e) {
      console.error(e);
    }
  }

  OnEndOfStoredEvents(c: Connection, sub: string) {
    const q = this.GetQuery(sub);
    if (q) {
      q.eose(sub, c.Address);
      const f = this.Feeds.get(q.id);
      if (f) {
        f.loading = q.progress <= 0.5;
        console.debug(`${sub} loading=${f.loading}, progress=${q.progress}`);
      }
      if (!q.leaveOpen) {
        c.CloseReq(sub);
      }
    }
  }

  OnEvent(sub: string, ev: TaggedRawEvent) {
    const feed = this.GetFeed(sub);
    if (feed) {
      feed.add(ev);
    }
  }

  GetFeed(sub: string) {
    const subFilterId = /-\d+$/i;
    if (sub.match(subFilterId)) {
      // feed events back into parent query
      sub = sub.split(subFilterId)[0];
    }
    return this.Feeds.get(sub);
  }

  GetQuery(sub: string) {
    const subFilterId = /-\d+$/i;
    if (sub.match(subFilterId)) {
      // feed events back into parent query
      sub = sub.split(subFilterId)[0];
    }
    return this.Queries.get(sub);
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
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnConnected = () => {
          for (const [, q] of this.Queries) {
            q.sendToRelay(c);
          }
        };
        await c.Connect();
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

  Query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder | null): Readonly<T> {
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

    if (!req) return new type();

    if (this.Queries.has(req.id)) {
      const filters = req.build();
      const q = unwrap(this.Queries.get(req.id));
      q.unCancel();

      const diff = diffFilters(q.request.filters, filters);
      if (!diff.changed && !req.options?.skipDiff) {
        this.#changed();
        return unwrap(this.Feeds.get(req.id)) as Readonly<T>;
      } else {
        const subQ = new Query(`${q.id}-${q.subQueries.length + 1}`, {
          filters: diff.filters,
          started: unixNowMs(),
        });
        q.subQueries.push(subQ);
        q.request.filters = filters;
        const f = unwrap(this.Feeds.get(req.id));
        f.loading = true;
        this.SendQuery(subQ);
        this.#changed();
        return f as Readonly<T>;
      }
    } else {
      return this.AddQuery<T>(type, req);
    }
  }

  AddQuery<T extends NoteStore>(type: { new (): T }, rb: RequestBuilder): T {
    const q = new Query(rb.id, {
      filters: rb.build(),
      started: unixNowMs(),
      finished: 0,
    });
    if (rb.options?.leaveOpen) {
      q.leaveOpen = rb.options.leaveOpen;
    }
    if (rb.options?.relays) {
      q.relays = rb.options.relays;
    }

    this.Queries.set(rb.id, q);
    const store = new type();
    this.Feeds.set(rb.id, store);
    this.SendQuery(q);
    this.#changed();
    return store;
  }

  CancelQuery(sub: string) {
    const q = this.Queries.get(sub);
    if (q) {
      q.cancel();
    }
  }

  SendQuery(q: Query) {
    for (const [, s] of this.Sockets) {
      q.sendToRelay(s);
    }
  }

  /**
   * Send events to writable relays
   */
  BroadcastEvent(ev: RawEvent) {
    for (const [, s] of this.Sockets) {
      s.SendEvent(ev);
    }
  }

  /**
   * Write an event to a relay then disconnect
   */
  async WriteOnceToRelay(address: string, ev: RawEvent) {
    const c = new Connection(address, { write: true, read: false }, this.HandleAuth, true);
    await c.Connect();
    await c.SendAsync(ev);
    c.Close();
  }

  #changed() {
    this.#snapshot = Object.freeze({
      queries: [...this.Queries.values()].map(a => {
        return {
          id: a.id,
          filters: a.request.filters,
          closing: a.closing,
          subFilters: a.subQueries.map(a => a.request.filters).flat(),
        };
      }),
    });
    for (const h of this.#stateHooks) {
      h();
    }
  }

  #cleanup() {
    const now = unixNowMs();
    let changed = false;
    for (const [k, v] of this.Queries) {
      if (v.closingAt && v.closingAt < now) {
        v.sendClose();
        this.Queries.delete(k);
        this.Feeds.delete(k);
        console.debug("Removed:", k);
        changed = true;
      }
    }
    if (changed) {
      this.#changed();
    }
    setTimeout(() => this.#cleanup(), 1_000);
  }
}

export const System = new NostrSystem();
