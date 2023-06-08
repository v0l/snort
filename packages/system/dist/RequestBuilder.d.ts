import { ReqFilter, u256, HexKey, EventKind } from ".";
import { RelayCache } from "./GossipModel";
/**
 * Which strategy is used when building REQ filters
 */
export declare enum RequestStrategy {
    /**
     * Use the users default relays to fetch events,
     * this is the fallback option when there is no better way to query a given filter set
     */
    DefaultRelays = 1,
    /**
     * Using a cached copy of the authors relay lists NIP-65, split a given set of request filters by pubkey
     */
    AuthorsRelays = 2,
    /**
     * Relay hints are usually provided when using replies
     */
    RelayHintedEventIds = 3
}
/**
 * A built REQ filter ready for sending to System
 */
export interface BuiltRawReqFilter {
    filters: Array<ReqFilter>;
    relay: string;
    strategy: RequestStrategy;
}
export interface RequestBuilderOptions {
    leaveOpen?: boolean;
    relays?: Array<string>;
    /**
     * Do not apply diff logic and always use full filters for query
     */
    skipDiff?: boolean;
}
/**
 * Nostr REQ builder
 */
export declare class RequestBuilder {
    #private;
    id: string;
    constructor(id: string);
    get numFilters(): number;
    get options(): RequestBuilderOptions | undefined;
    withFilter(): RequestFilterBuilder;
    withOptions(opt: RequestBuilderOptions): this;
    buildRaw(): Array<ReqFilter>;
    build(relays: RelayCache): Array<BuiltRawReqFilter>;
    /**
     * Detects a change in request from a previous set of filters
     * @param q All previous filters merged
     * @returns
     */
    buildDiff(relays: RelayCache, filters: Array<ReqFilter>): Array<BuiltRawReqFilter>;
}
/**
 * Builder class for a single request filter
 */
export declare class RequestFilterBuilder {
    #private;
    get filter(): {
        ids?: string[] | undefined; /**
         * Relay hints are usually provided when using replies
         */
        authors?: string[] | undefined;
        kinds?: number[] | undefined;
        "#e"?: string[] | undefined;
        "#p"?: string[] | undefined;
        "#t"?: string[] | undefined;
        "#d"?: string[] | undefined;
        "#r"?: string[] | undefined;
        search?: string | undefined;
        since?: number | undefined;
        until?: number | undefined;
        limit?: number | undefined;
    };
    get relayHints(): Map<string, string[]>;
    ids(ids: Array<u256>): this;
    id(id: u256, relay?: string): this;
    authors(authors?: Array<HexKey>): this;
    kinds(kinds?: Array<EventKind>): this;
    since(since?: number): this;
    until(until?: number): this;
    limit(limit?: number): this;
    tag(key: "e" | "p" | "d" | "t" | "r", value?: Array<string>): this;
    search(keyword?: string): this;
    /**
     * Build/expand this filter into a set of relay specific queries
     */
    build(relays: RelayCache, id: string): Array<BuiltRawReqFilter>;
}
//# sourceMappingURL=RequestBuilder.d.ts.map