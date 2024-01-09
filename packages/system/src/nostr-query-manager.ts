import debug from "debug";
import EventEmitter from "eventemitter3";
import { BuiltRawReqFilter, RequestBuilder, SystemInterface, TaggedNostrEvent } from ".";
import { Query, TraceReport } from "./query";
import { unwrap } from "@snort/shared";
import { FilterCacheLayer, IdsFilterCacheLayer } from "./filter-cache-layer";
import { trimFilters } from "./request-trim";

interface NostrQueryManagerEvents {
  change: () => void;
  trace: (report: TraceReport) => void;
}

/**
 * Query manager handles sending requests to the nostr network
 */
export class NostrQueryManager extends EventEmitter<NostrQueryManagerEvents> {
  #log = debug("NostrQueryManager");

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
      q.on("filters", fx => {
        this.#send(q, fx);
      });

      this.#queries.set(req.id, q);
      this.emit("change");
      return q;
    }
  }

  /**
   * Async fetch results
   */
  fetch(req: RequestBuilder, cb?: (evs: ReadonlyArray<TaggedNostrEvent>) => void) {
    const q = this.query(req);
    return new Promise<Array<TaggedNostrEvent>>(resolve => {
      if (cb) {
        q.feed.on("event", cb);
      }
      q.feed.on("progress", loading => {
        if (!loading) {
          q.feed.off("event");
          q.cancel();
          resolve(unwrap(q.snapshot.data));
        }
      });
    });
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
    for (const f of qSend.filters) {
      if (f.authors) {
        this.#system.relayLoader.TrackKeys(f.authors);
      }
    }

    // check for empty filters
    const fNew = trimFilters(qSend.filters);
    if (fNew.length === 0) {
      return;
    }
    qSend.filters = fNew;

    if (qSend.relay) {
      this.#log("Sending query to %s %O", qSend.relay, qSend);
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
          this.#log("Sending query to %s %O", a, qSend);
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
