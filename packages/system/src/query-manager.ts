import debug from "debug";
import { EventEmitter } from "eventemitter3";
import { BuiltRawReqFilter, FlatReqFilter, ReqFilter, RequestBuilder, SystemInterface, TaggedNostrEvent } from ".";
import { Query, TraceReport } from "./query";
import { trimFilters } from "./request-trim";
import { eventMatchesFilter, isRequestSatisfied } from "./request-matcher";

interface QueryManagerEvents {
  change: () => void;
  trace: (report: TraceReport) => void;
  request: (subId: string, req: BuiltRawReqFilter) => void;
}

/**
 * Query manager handles sending requests to the nostr network
 */
export class QueryManager extends EventEmitter<QueryManagerEvents> {
  #log = debug("QueryManager");

  /**
   * All active queries
   */
  #queries: Map<string, Query> = new Map();

  /**
   * System interface handle
   */
  #system: SystemInterface;

  constructor(system: SystemInterface) {
    super();
    this.#system = system;

    setInterval(() => this.#cleanup(), 1_000);
  }

  get(id: string) {
    return this.#queries.get(id);
  }

  /**
   * Compute query to send to relays
   */
  query(req: RequestBuilder): Query {
    const existing = this.#queries.get(req.id);
    if (existing) {
      if (existing.addRequest(req)) {
        this.emit("change");
      }
      return existing;
    } else {
      const q = new Query(req);
      q.on("trace", r => this.emit("trace", r));
      q.on("request", (id, fx) => {
        this.#send(q, fx);
      });

      this.#queries.set(req.id, q);
      if (req.numFilters > 0) {
        this.emit("change");
      }
      return q;
    }
  }

  handleEvent(ev: TaggedNostrEvent) {
    this.#queries.forEach(q => q.handleEvent("*", ev));
  }

  /**
   * Async fetch results
   */
  async fetch(req: RequestBuilder, cb?: (evs: Array<TaggedNostrEvent>) => void) {
    const filters = req.buildRaw();
    const q = this.query(req);
    if (cb) {
      q.on("event", cb);
    }
    await new Promise<void>(resolve => {
      q.once("done", resolve);
    });
    const results = q.feed.takeSnapshot();
    if (cb) {
      q.off("event", cb);
    }
    return results.filter(a => filters.some(b => eventMatchesFilter(a, b)));
  }

  *[Symbol.iterator]() {
    for (const kv of this.#queries) {
      yield kv;
    }
  }

  async #send(q: Query, filters: Array<ReqFilter>) {
    // check for empty filters
    filters = trimFilters(filters);

    // automated outbox model, load relays for queried authors
    for (const f of filters) {
      if (f.authors) {
        this.#system.relayLoader.TrackKeys(f.authors);
      }
    }

    let syncFrom: Array<TaggedNostrEvent> = [];
    // fetch results from cache first, flag qSend for sync
    if (this.#system.cacheRelay) {
      const data = await this.#system.cacheRelay.query(["REQ", q.id, ...filters]);
      syncFrom = data;
      if (data.length > 0) {
        this.#log("Adding from cache %s %O", q.id, data);
        q.feed.add(syncFrom);
      }
    }

    // remove satisfied filters
    if (syncFrom.length > 0) {
      // only remove the "ids" filters
      const newFilters = filters.filter(a => !isRequestSatisfied(a, syncFrom));
      if (newFilters.length !== filters.length) {
        this.#log("Removing satisfied filters %o %o", newFilters, filters);
        filters = newFilters;
      }
    }

    // nothing left to send
    if (filters.length === 0) {
      this.#log("Dropping %s %o", q.id);
      return;
    }

    if (this.#system.requestRouter) {
      filters = this.#system.requestRouter.forAllRequest(filters);
    }
    const expanded = filters.flatMap(a => this.#system.optimizer.expandFilter(a));
    const qSend = this.#groupFlatByRelay(expanded);
    qSend.forEach(a => (a.syncFrom = syncFrom));
    await Promise.all(qSend.map(a => this.#sendToRelays(q, a)));
  }

  #groupFlatByRelay(filters: Array<FlatReqFilter>) {
    const relayMerged = filters.reduce((acc, v) => {
      const relay = v.relay ?? "";
      // delete relay from filter
      delete v.relay;
      const existing = acc.get(relay);
      if (existing) {
        existing.push(v);
      } else {
        acc.set(relay, [v]);
      }
      return acc;
    }, new Map<string, Array<FlatReqFilter>>());

    const ret = [];
    for (const [k, v] of relayMerged.entries()) {
      const filters = this.#system.optimizer.flatMerge(v);
      ret.push({
        relay: k,
        filters,
      } as BuiltRawReqFilter);
    }
    return ret;
  }

  async #sendToRelays(q: Query, qSend: BuiltRawReqFilter) {
    if (qSend.relay) {
      const nc = await this.#system.pool.connect(qSend.relay, { read: true, write: true }, true);
      if (nc) {
        const qt = q.sendToRelay(nc, qSend);
        if (qt) {
          this.#log("Sent query %s to %s %s %O", qt.id, qSend.relay, q.id, qSend);
          return [qt];
        } else {
          this.#log("Query not sent to %s: %O", qSend.relay, qSend);
        }
      } else {
        console.warn("Failed to connect to new relay for:", qSend.relay, q);
      }
    } else {
      const ret = [];
      for (const [a, s] of this.#system.pool) {
        if (!s.ephemeral) {
          const qt = q.sendToRelay(s, qSend);
          if (qt) {
            this.#log("Sent query %s to %s %s %O", qt.id, qSend.relay, q.id, qSend);
            ret.push(qt);
          } else {
            this.#log("Query not sent to %s: %O", a, qSend);
          }
        }
      }
      return ret;
    }

    this.emit("request", q.id, qSend);
  }

  #cleanup() {
    let changed = false;
    for (const [k, v] of this.#queries) {
      if (v.canRemove()) {
        v.sendClose();
        this.#queries.delete(k);
        this.#log("Deleted query %s", k);
        changed = true;
      }
    }
    if (changed) {
      this.emit("change");
    }
  }
}
