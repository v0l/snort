import { RelayMetrics } from ".";
import { CacheStore, FeedCache } from "@snort/shared";

export class RelayMetricCache extends FeedCache<RelayMetrics> {
  constructor(store?: CacheStore<RelayMetrics>) {
    super("RelayMetrics", store);
  }

  key(of: RelayMetrics): string {
    return of.addr;
  }

  override async preload(): Promise<void> {
    await super.preload();
    // load everything
    await this.buffer([...this.onTable]);
  }

  takeSnapshot(): Array<RelayMetrics> {
    return [...this.cache.values()];
  }

  async search() {
    return <Array<RelayMetrics>>[];
  }
}
