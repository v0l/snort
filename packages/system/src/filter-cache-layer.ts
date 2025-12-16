import type { BuiltRawReqFilter } from "./request-builder";
import type { NostrEvent } from "./nostr";
import type { Query } from "./query";

export interface EventCache {
  bulkGet: (ids: Array<string>) => Promise<Array<NostrEvent>>;
}

export interface FilterCacheLayer {
  processFilter(q: Query, req: BuiltRawReqFilter): Promise<BuiltRawReqFilter>;
}
