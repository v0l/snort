import debug from "debug";
import EventEmitter from "eventemitter3";
import { BuiltRawReqFilter, NoteCollection, NoteStore, RequestBuilder, SystemInterface, TaggedNostrEvent } from ".";
import { Query, TraceReport } from "./query";
import { unwrap } from "@snort/shared";

interface NostrQueryManagerEvents {
  change: () => void;
  trace: (report: TraceReport) => void;
  sendQuery: (q: Query, filter: BuiltRawReqFilter) => void;
}

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
  query<T extends NoteStore>(type: { new (): T }, req: RequestBuilder): Query {
    const existing = this.#queries.get(req.id);
    if (existing) {
      // if same instance, just return query
      if (existing.fromInstance === req.instance) {
        return existing;
      }
      const filters = !req.options?.skipDiff ? req.buildDiff(this.#system, existing.filters) : req.build(this.#system);
      if (filters.length === 0 && !!req.options?.skipDiff) {
        return existing;
      } else {
        for (const subQ of filters) {
          this.emit("sendQuery", existing, subQ);
        }
        this.emit("change");
        return existing;
      }
    } else {
      const store = new type();

      const filters = req.build(this.#system);
      const q = new Query(req.id, req.instance, store, req.options?.leaveOpen, req.options?.timeout);
      q.on("trace", r => this.emit("trace", r));

      this.#queries.set(req.id, q);
      for (const subQ of filters) {
        this.emit("sendQuery", q, subQ);
      }
      this.emit("change");
      return q;
    }
  }

  /**
   * Async fetch results
   */
  fetch(req: RequestBuilder, cb?: (evs: ReadonlyArray<TaggedNostrEvent>) => void) {
    const q = this.query(NoteCollection, req);
    return new Promise<Array<TaggedNostrEvent>>(resolve => {
      let t: ReturnType<typeof setTimeout> | undefined;
      let tBuf: Array<TaggedNostrEvent> = [];
      if (cb) {
        q.feed.on("event", cb);
      }
      q.feed.on("progress", loading => {
        if (!loading) {
          q.feed.off("event");
          q.cancel();
          resolve(unwrap((q.feed as NoteCollection).snapshot.data));
        }
      });
    });
  }

  *[Symbol.iterator]() {
    for (const kv of this.#queries) {
      yield kv;
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
