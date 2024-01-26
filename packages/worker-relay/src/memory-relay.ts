import EventEmitter from "eventemitter3";
import { NostrEvent, RelayHandler, RelayHandlerEvents, ReqFilter, eventMatchesFilter } from "./types";
import debug from "debug";

/**
 * A very simple dumb fallback relay using a flat table
 */
export class InMemoryRelay extends EventEmitter<RelayHandlerEvents> implements RelayHandler {
  #events: Map<string, NostrEvent> = new Map();
  #log = debug("InMemoryRelay");

  init(path: string): Promise<void> {
    this.#log("Using in-memory relay");
    return Promise.resolve();
  }

  count(req: ReqFilter): number {
    let ret = 0;
    for (const [, e] of this.#events) {
      if (eventMatchesFilter(e, req)) {
        ret++;
      }
    }
    return ret;
  }

  summary(): Record<string, number> {
    let ret = {} as Record<string, number>;
    for (const [k, v] of this.#events) {
      ret[v.kind.toString()] ??= 0;
      ret[v.kind.toString()]++;
    }
    return ret;
  }

  dump(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array());
  }

  close(): void {
    // nothing
  }

  event(ev: NostrEvent) {
    if (this.#events.has(ev.id)) return false;
    this.#events.set(ev.id, ev);
    this.emit("event", [ev]);
    return true;
  }

  eventBatch(evs: NostrEvent[]) {
    const inserted = [];
    for (const ev of evs) {
      if (this.#events.has(ev.id)) continue;
      this.#events.set(ev.id, ev);
      inserted.push(ev);
    }
    if (inserted.length > 0) {
      this.emit("event", inserted);
      return true;
    }
    return false;
  }

  sql(sql: string, params: (string | number)[]): (string | number)[][] {
    return [];
  }

  req(id: string, filter: ReqFilter) {
    const ret = [];
    for (const [, e] of this.#events) {
      if (eventMatchesFilter(e, filter)) {
        if (filter.ids_only === true) {
          ret.push(e.id);
        } else {
          ret.push(e);
        }
      }
    }
    return ret;
  }
}
