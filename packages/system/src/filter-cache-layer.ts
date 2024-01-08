import { BuiltRawReqFilter, RequestStrategy } from "./request-builder";
import { NostrEvent, TaggedNostrEvent } from "./nostr";
import { Query } from "./query";

export interface EventCache {
  bulkGet: (ids: Array<string>) => Promise<Array<NostrEvent>>;
}

export interface FilterCacheLayer {
  processFilter(q: Query, req: BuiltRawReqFilter): Promise<BuiltRawReqFilter>;
}

export class IdsFilterCacheLayer implements FilterCacheLayer {
  constructor(readonly cache: EventCache) {}

  async processFilter(q: Query, req: BuiltRawReqFilter) {
    for (const f of req.filters) {
      if (f.ids) {
        const cacheResults = await this.cache.bulkGet(f.ids);
        if (cacheResults.length > 0) {
          const resultIds = new Set(cacheResults.map(a => a.id));
          f.ids = f.ids.filter(a => !resultIds.has(a));

          // this step is important for buildDiff, if a filter doesnt exist with the ids which are from cache
          // we will create an infinite loop where every render we insert a new query for the ids which are missing
          q.insertCompletedTrace(
            {
              filters: [{ ...f, ids: [...resultIds] }],
              strategy: RequestStrategy.ExplicitRelays,
              relay: req.relay,
            },
            cacheResults as Array<TaggedNostrEvent>,
          );
        }
      }
    }
    return req;
  }
}
