import { FullRelaySettings, ReqFilter } from ".";
export interface RelayTaggedFilter {
    relay: string;
    filter: ReqFilter;
}
export interface RelayTaggedFilters {
    relay: string;
    filters: Array<ReqFilter>;
}
export interface RelayCache {
    get(pubkey?: string): Array<FullRelaySettings> | undefined;
}
export declare function splitAllByWriteRelays(cache: RelayCache, filters: Array<ReqFilter>): RelayTaggedFilters[];
/**
 * Split filters by authors
 * @param filter
 * @returns
 */
export declare function splitByWriteRelays(cache: RelayCache, filter: ReqFilter): Array<RelayTaggedFilter>;
//# sourceMappingURL=GossipModel.d.ts.map