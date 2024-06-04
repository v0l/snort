import { unixNow } from "@snort/shared";
import EventEmitter from "eventemitter3";
import { ReqFilter, RequestBuilder, SystemInterface, TaggedNostrEvent } from "..";
import { v4 as uuid } from "uuid";

/**
 * When nostr was created
 */
const NostrBirthday: number = new Date(2021, 1, 1).getTime() / 1000;

interface RangeSyncEvents {
  event: (ev: Array<TaggedNostrEvent>) => void;
  scan: (from: number) => void;
}

/**
 * A simple time based sync for pulling lots of data from nostr
 */
export class RangeSync extends EventEmitter<RangeSyncEvents> {
  #id = uuid();
  #start: number = NostrBirthday;
  #windowSize: number = 60 * 60 * 12;
  #fetcher!: SystemInterface["Fetch"];

  private constructor() {
    super();
  }

  static forSystem(system: SystemInterface) {
    const rs = new RangeSync();
    rs.#fetcher = (r, c) => system.Fetch(r, c);
    return rs;
  }

  static forFetcher(fn: SystemInterface["Fetch"]) {
    const rs = new RangeSync();
    rs.#fetcher = fn;
    return rs;
  }

  /**
   * Set window size in seconds
   */
  setWindowSize(n: number) {
    if (n < 60) {
      throw new Error("Window size too small");
    }
    this.#windowSize = n;
  }

  /**
   * Set start time for range sync
   * @param n Unix timestamp
   */
  setStartPoint(n: number) {
    if (n < NostrBirthday) {
      throw new Error("Start point cannot be before nostr's birthday");
    }
    this.#start = n;
  }

  /**
   * Request to sync with a given filter
   */
  async sync(filter: ReqFilter) {
    if (filter.since !== undefined || filter.until !== undefined || filter.limit !== undefined) {
      throw new Error("Filter must not contain since/until/limit");
    }

    const now = unixNow();
    let ctr = 1;
    for (let end = now; end > this.#start; end -= this.#windowSize) {
      const rb = new RequestBuilder(`${this.#id}+${ctr++}`);
      rb.withBareFilter(filter)
        .since(end - this.#windowSize)
        .until(end);
      this.emit("scan", end);
      const results = await this.#fetcher(rb);
      this.emit("event", results);
    }
  }
}
