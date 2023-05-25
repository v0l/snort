import { AuthHandler, TaggedRawEvent, RelaySettings, Connection, RawReqFilter, RawEvent } from "@snort/nostr";

import { sanitizeRelayUrl, unixNowMs, unwrap } from "SnortUtils";
import { RequestBuilder } from "./RequestBuilder";
import { EventBuilder } from "./EventBuilder";
import {
  FlatNoteStore,
  NoteStore,
  PubkeyReplaceableNoteStore,
  ParameterizedReplaceableNoteStore,
  ReplaceableNoteStore,
} from "./NoteCollection";
import { diffFilters } from "./RequestSplitter";
import { Query, QueryBase } from "./Query";
import { splitAllByWriteRelays } from "./GossipModel";
import ExternalStore from "ExternalStore";

export {
  NoteStore,
  RequestBuilder,
  FlatNoteStore,
  PubkeyReplaceableNoteStore,
  ParameterizedReplaceableNoteStore,
  ReplaceableNoteStore,
  Query,
  EventBuilder,
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
export class NostrSystem extends ExternalStore<SystemSnapshot> {
  /**
   * All currently connected websockets
   */
  Sockets: Map<string, Connection>;

  /**
   * All active queries
   */
  Queries: Map<string, Query> = new Map();

  /**
   * Handler function for NIP-42
   */
  HandleAuth?: AuthHandler;

  constructor() {
    super();
    this.Sockets = new Map();
    this.#cleanup();
  }

  /**
   * Connect to a NOSTR relay if not already connected
   */
  async ConnectToRelay(address: string, options: RelaySettings) {
    try {
      const addr = unwrap(sanitizeRelayUrl(address));
      if (!this.Sockets.has(addr)) {
        const c = new Connection(addr, options, this.HandleAuth?.bind(this));
        this.Sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnDisconnect = id => this.OnRelayDisconnect(id);
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

  OnRelayDisconnect(id: string) {
    for (const [, q] of this.Queries) {
      q.connectionLost(id);
    }
  }

  OnEndOfStoredEvents(c: Readonly<Connection>, sub: string) {
    const q = this.GetQuery(sub);
    if (q) {
      q.eose(sub, c);
    }
  }

  OnEvent(sub: string, ev: TaggedRawEvent) {
    const q = this.GetQuery(sub);
    if (q?.feed) {
      q.feed.add(ev);
    }
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
        const c = new Connection(addr, { read: true, write: false }, this.HandleAuth?.bind(this), true);
        this.Sockets.set(addr, c);
        c.OnEvent = (s, e) => this.OnEvent(s, e);
        c.OnEose = s => this.OnEndOfStoredEvents(c, s);
        c.OnDisconnect = id => this.OnRelayDisconnect(id);
        c.OnConnected = () => {
          for (const [, q] of this.Queries) {
            if (q.progress !== 1) {
              q.sendToRelay(c);
            }
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

      const diff = diffFilters(q.filters, filters);
      if (!diff.changed && !req.options?.skipDiff) {
        this.notifyChange();
        return unwrap(q.feed) as Readonly<T>;
      } else {
        const splitFilters = splitAllByWriteRelays(filters);
        for (const sf of splitFilters) {
          const subQ = {
            id: `${q.id}-${q.subQueryCounter++}`,
            filters: sf.filters,
            relays: sf.relay ? [sf.relay] : undefined,
          } as QueryBase;
          this.SendSubQuery(q, subQ);
        }
        q.filters = filters;
        this.notifyChange();
        return q.feed as Readonly<T>;
      }
    } else {
      return this.AddQuery<T>(type, req);
    }
  }

  AddQuery<T extends NoteStore>(type: { new (): T }, rb: RequestBuilder): T {
    const store = new type();

    const filters = rb.build();
    const q = new Query(rb.id, filters, store);
    if (rb.options?.leaveOpen) {
      q.leaveOpen = rb.options.leaveOpen;
    }
    if (rb.options?.relays && (rb.options?.relays?.length ?? 0) > 0) {
      q.relays = rb.options.relays;
    }

    this.Queries.set(rb.id, q);
    const splitFilters = splitAllByWriteRelays(filters);
    if (splitFilters.length > 1) {
      for (const sf of splitFilters) {
        const subQ = {
          id: `${q.id}-${q.subQueryCounter++}`,
          filters: sf.filters,
          relays: sf.relay ? [sf.relay] : undefined,
        } as QueryBase;
        this.SendSubQuery(q, subQ);
      }
    } else {
      this.SendQuery(q);
    }
    this.notifyChange();
    return store;
  }

  CancelQuery(sub: string) {
    const q = this.Queries.get(sub);
    if (q) {
      q.cancel();
    }
  }

  async SendQuery(q: Query) {
    if (q.relays && q.relays.length > 0) {
      for (const r of q.relays) {
        const s = this.Sockets.get(r);
        if (s) {
          q.sendToRelay(s);
        } else {
          const nc = await this.ConnectEphemeralRelay(r);
          if (nc) {
            q.sendToRelay(nc);
          } else {
            console.warn("Failed to connect to new relay for:", r, q);
          }
        }
      }
    } else {
      for (const [, s] of this.Sockets) {
        if (!s.Ephemeral) {
          q.sendToRelay(s);
        }
      }
    }
  }

  async SendSubQuery(q: Query, subQ: QueryBase) {
    if (subQ.relays && subQ.relays.length > 0) {
      for (const r of subQ.relays) {
        const s = this.Sockets.get(r);
        if (s) {
          q.sendSubQueryToRelay(s, subQ);
        } else {
          const nc = await this.ConnectEphemeralRelay(r);
          if (nc) {
            q.sendSubQueryToRelay(nc, subQ);
          } else {
            console.warn("Failed to connect to new relay for:", r, subQ);
          }
        }
      }
    } else {
      for (const [, s] of this.Sockets) {
        if (!s.Ephemeral) {
          q.sendSubQueryToRelay(s, subQ);
        }
      }
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
    return new Promise<void>((resolve, reject) => {
      const c = new Connection(address, { write: true, read: false }, this.HandleAuth, true);

      const t = setTimeout(reject, 5_000);
      c.OnConnected = async () => {
        clearTimeout(t);
        await c.SendAsync(ev);
        c.Close();
        resolve();
      };
      c.Connect();
    });
  }

  takeSnapshot(): SystemSnapshot {
    return {
      queries: [...this.Queries.values()].map(a => {
        return {
          id: a.id,
          filters: a.filters,
          closing: a.closing,
          subFilters: [],
        };
      }),
    };
  }

  #cleanup() {
    const now = unixNowMs();
    let changed = false;
    for (const [k, v] of this.Queries) {
      if (v.closingAt && v.closingAt < now) {
        v.sendClose();
        this.Queries.delete(k);
        changed = true;
      }
    }
    if (changed) {
      this.notifyChange();
    }
    setTimeout(() => this.#cleanup(), 1_000);
  }
}

export const System = new NostrSystem();
