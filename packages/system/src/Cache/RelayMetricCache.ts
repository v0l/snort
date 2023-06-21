import { db, RelayMetrics } from ".";
import { FeedCache } from "@snort/shared";

export class RelayMetricCache extends FeedCache<RelayMetrics> {
    constructor() {
        super("RelayMetrics", db.relayMetrics);
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
}