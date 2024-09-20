import { Connection, SyncCommand } from "../connection";
import { EventExt, EventType } from "../event-ext";
import { NoteCollection } from "../note-collection";
import { RangeSync } from "./range-sync";
import { NegentropyFlow } from "../negentropy/negentropy-flow";
import { SystemConfig, SystemInterface } from "../system";
import { findTag } from "../utils";

export interface ConnectionSyncModule {
  sync: (c: Connection, item: SyncCommand, cb?: () => void) => void;
}

export class DefaultSyncModule implements ConnectionSyncModule {
  constructor(
    readonly method: SystemConfig["fallbackSync"],
    readonly system: SystemInterface,
  ) {}

  sync(c: Connection, item: SyncCommand, cb?: () => void) {
    const [_, id, eventSet, ...filters] = item;
    if ((c.info?.negentropy ?? NaN) >= 1) {
      const newFilters = filters;
      const neg = new NegentropyFlow(id, c, eventSet, newFilters);
      neg.once("finish", filters => {
        if (filters.length > 0) {
          c.request(["REQ", id, ...filters], cb);
        } else {
          // no results to query, emulate closed
          c.emit("closed", id, "Nothing to sync");
        }
      });
      neg.once("error", () => {
        this.#fallbackSync(c, item, cb);
      });
      neg.start();
    } else {
      this.#fallbackSync(c, item, cb);
    }
  }

  #fallbackSync(c: Connection, item: SyncCommand, cb?: () => void) {
    const [type, id, eventSet, ...filters] = item;
    if (type !== "SYNC") throw new Error("Must be a SYNC command");

    // if the event is replaceable there is no need to use any special sync query,
    // just send the filters directly
    const isReplaceableSync = filters.every(
      a =>
        a.kinds?.every(
          b =>
            EventExt.getType(b) === EventType.Replaceable || EventExt.getType(b) === EventType.ParameterizedReplaceable,
        ) ?? false,
    );
    if (filters.some(a => a.since || a.until || a.ids || a.limit) || isReplaceableSync) {
      c.request(["REQ", id, ...filters], cb);
    } else if (this.method === "since") {
      this.#syncSince(c, item, cb);
    } else if (this.method === "range-sync") {
      this.#syncRangeSync(c, item, cb);
    } else {
      throw new Error("No fallback sync method");
    }
  }

  /**
   * Split a set of filters down into individual filters
   * which can be used to since request updates to replaceable events
   */
  #breakdownReplaceable(item: SyncCommand) {
    const [type, id, eventSet, ...filters] = item;

    const flat = filters.flatMap(a => this.system.optimizer.expandFilter(a));
    const mapped = flat.map(a => {
      if (!a.kinds || !a.authors) return a;
      if (EventExt.isReplaceable(a.kinds)) {
        const latest = eventSet.find(
          b => b.kind === a.kinds && b.pubkey === a.authors && (!a["#d"] || findTag(b, "d") === a["#d"]),
        );
        if (latest) {
          return {
            ...a,
            since: latest.created_at + 1,
          };
        }
      }
      return a;
    });
    const compressed = this.system.optimizer.flatMerge(mapped);
    if (compressed.length !== filters.length) {
      console.debug("COMPRESSED", id, filters, compressed);
    }
    return compressed;
  }

  /**
   * Using the latest data, fetch only newer items
   *
   * The downfall of this method is when the dataset is truncated by the relay (ie. limit results to 1000 items)
   */
  #syncSince(c: Connection, item: SyncCommand, cb?: () => void) {
    const [type, id, eventSet, ...filters] = item;
    if (type !== "SYNC") throw new Error("Must be a SYNC command");
    //const broken = this.#breakdownReplaceable(item);
    const latest = eventSet
      //.filter(a => !EventExt.isReplaceable(a.kind))
      .reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0);
    const newFilters = filters.map(a => {
      if (a.since || latest === 0) return a;
      return {
        ...a,
        since: latest + 1,
      };
    });
    c.request(["REQ", id, ...newFilters], cb);
  }

  /**
   * Using the RangeSync class, sync data using fixed window size
   */
  #syncRangeSync(c: Connection, item: SyncCommand, cb?: () => void) {
    const [type, id, eventSet, ...filters] = item;
    if (type !== "SYNC") throw new Error("Must be a SYNC command");

    const rs = RangeSync.forFetcher(async (rb, cb) => {
      return await new Promise((resolve, reject) => {
        const results = new NoteCollection();
        const f = rb.buildRaw();
        c.on("event", (c, e) => {
          if (rb.id === c) {
            cb?.([e]);
            results.add(e);
          }
        });
        c.on("eose", s => {
          if (s === rb.id) {
            resolve(results.takeSnapshot());
          }
        });
        c.request(["REQ", rb.id, ...f], undefined);
      });
    });
    const latest = eventSet.reduce((acc, v) => (acc = v.created_at > acc ? v.created_at : acc), 0);
    rs.setStartPoint(latest + 1);
    rs.on("event", ev => {
      ev.forEach(e => c.emit("event", id, e));
    });
    for (const f of filters) {
      rs.sync(f);
    }
  }
}
