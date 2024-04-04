import { BuiltRawReqFilter } from "./request-builder";
import { NostrEvent } from "./nostr";
import { Query } from "./query";

export interface EventCache {
  bulkGet: (ids: Array<string>) => Promise<Array<NostrEvent>>;
}

export interface FilterCacheLayer {
  processFilter(q: Query, req: BuiltRawReqFilter): Promise<BuiltRawReqFilter>;
}
