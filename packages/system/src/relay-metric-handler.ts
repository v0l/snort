import { CachedTable, unixNowMs } from "@snort/shared";
import { RelayMetrics } from "./cache";
import { QueryTraceEvent, QueryTraceState } from "./query";

export class RelayMetricHandler {
  readonly #cache: CachedTable<RelayMetrics>;

  constructor(cache: CachedTable<RelayMetrics>) {
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

  onTraceEvent(event: QueryTraceEvent) {
    // Only track latency for terminal states
    if (
      [
        QueryTraceState.EOSE,
        QueryTraceState.TIMEOUT,
        QueryTraceState.DROP,
        QueryTraceState.REMOTE_CLOSE,
        QueryTraceState.LOCAL_CLOSE,
      ].includes(event.state)
    ) {
      const v = this.#cache.getFromCache(event.relay);
      if (v) {
        // Calculate response time from timestamps (would need to track WAITING timestamp)
        // For now, we can skip latency tracking or implement it differently
        // v.latency.push(responseTime);
        // v.latency = v.latency.slice(-50);
      }
    }
  }

  async #flush() {
    const data = this.#cache.snapshot();
    await this.#cache.bulkSet(data);
  }
}
