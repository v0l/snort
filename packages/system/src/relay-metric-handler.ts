import { FeedCache, unixNowMs } from "@snort/shared";
import { RelayMetrics } from "./cache";
import { TraceReport } from "./query";

export class RelayMetricHandler {
  readonly #cache: FeedCache<RelayMetrics>;

  constructor(cache: FeedCache<RelayMetrics>) {
    this.#cache = cache;

    setInterval(() => {
      this.#flush();
    }, 10_000);
  }

  async onEvent(addr: string) {
    const v = await this.#cache.get(addr);
    if (v) {
      v.events++;
      v.lastSeen = unixNowMs();
    }
  }

  async onConnect(addr: string) {
    const v = await this.#cache.get(addr);
    if (v) {
      v.connects++;
      v.lastSeen = unixNowMs();
    } else {
      await this.#cache.set({
        addr: addr,
        connects: 1,
        disconnects: 0,
        events: 0,
        lastSeen: unixNowMs(),
        latency: [],
      });
    }
  }

  async onDisconnect(addr: string, code: number) {
    const v = await this.#cache.get(addr);
    if (v) {
      v.disconnects++;
    } else {
      await this.#cache.set({
        addr: addr,
        connects: 0,
        disconnects: 1,
        events: 0,
        lastSeen: unixNowMs(),
        latency: [],
      });
    }
  }

  onTraceReport(t: TraceReport) {
    const v = this.#cache.getFromCache(t.conn.Address);
    if (v) {
      v.latency.push(t.responseTime);
      v.latency = v.latency.slice(-50);
    }
  }

  async #flush() {
    const data = this.#cache.snapshot();
    await this.#cache.bulkSet(data);
  }
}
