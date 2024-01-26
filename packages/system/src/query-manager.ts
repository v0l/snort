import debug from "debug";
import EventEmitter from "eventemitter3";
import { BuiltRawReqFilter, RequestBuilder, RequestStrategy, SystemInterface, TaggedNostrEvent } from ".";
import { Query, TraceReport } from "./query";
import { FilterCacheLayer, IdsFilterCacheLayer } from "./filter-cache-layer";
import { trimFilters } from "./request-trim";

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

  /**
   * Query cache processing layers which can take data from a cache
   */
  #queryCacheLayers: Array<FilterCacheLayer> = [];

  constructor(system: SystemInterface) {
    super();
    this.#system = system;
    this.#queryCacheLayers.push(new IdsFilterCacheLayer(system.eventsCache));

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
      const q = new Query(this.#system, req);
      q.on("trace", r => this.emit("trace", r));
      q.on("request", (id, fx) => {
        this.#send(q, fx);
        this.emit("request", id, fx);
      });

      this.#queries.set(req.id, q);
      this.emit("change");
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
    const q = new Query(this.#system, req);
    q.on("trace", r => this.emit("trace", r));
    q.on("request", (subId, fx) => {
      this.#send(q, fx);
    });
    if (cb) {
      q.on("event", evs => cb(evs));
    }
    await new Promise<void>(resolve => {
      q.on("loading", loading => {
        this.#log("loading %s %o", q.id, loading);
        if (!loading) {
          resolve();
        }
      });
    });
    const results = q.feed.takeSnapshot();
    q.cleanup();
    this.#log("Fetch results for %s %o", q.id, results);
    return results;
  }

  *[Symbol.iterator]() {
    for (const kv of this.#queries) {
      yield kv;
    }
  }

  async #send(q: Query, qSend: BuiltRawReqFilter) {
    for (const qfl of this.#queryCacheLayers) {
      qSend = await qfl.processFilter(q, qSend);
    }
    if (this.#system.cacheRelay) {
      // fetch results from cache first, flag qSend for sync
      const data = await this.#system.cacheRelay.query(["REQ", q.id, ...qSend.filters]);
      if (data.length > 0) {
        qSend.syncFrom = data as Array<TaggedNostrEvent>;
        q.feed.add(data as Array<TaggedNostrEvent>);
      }
    }

    // automated outbox model, load relays for queried authors
    for (const f of qSend.filters) {
      if (f.authors) {
        this.#system.relayLoader.TrackKeys(f.authors);
      }
    }

    // check for empty filters
    const fNew = trimFilters(qSend.filters);
    if (fNew.length === 0) {
      this.#log("Dropping %s %o", q.id, qSend);
      return;
    }
    qSend.filters = fNew;

    if (qSend.relay) {
      this.#log("Sending query to %s %s %O", qSend.relay, q.id, qSend);
      const s = this.#system.pool.getConnection(qSend.relay);
      if (s) {
        const qt = q.sendToRelay(s, qSend);
        if (qt) {
          return [qt];
        }
      } else {
        const nc = await this.#system.pool.connect(qSend.relay, { read: true, write: true }, true);
        if (nc) {
          const qt = q.sendToRelay(nc, qSend);
          if (qt) {
            return [qt];
          }
        } else {
          console.warn("Failed to connect to new relay for:", qSend.relay, q);
        }
      }
    } else {
      const ret = [];
      for (const [a, s] of this.#system.pool) {
        if (!s.Ephemeral) {
          this.#log("Sending query to %s %s %O", a, q.id, qSend);
          const qt = q.sendToRelay(s, qSend);
          if (qt) {
            ret.push(qt);
          }
        }
      }
      return ret;
    }
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
