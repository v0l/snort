import { u256, ReqFilter } from "./Nostr";
export interface FlatReqFilter {
    ids?: u256;
    authors?: u256;
    kinds?: number;
    "#e"?: u256;
    "#p"?: u256;
    "#t"?: string;
    "#d"?: string;
    "#r"?: string;
    search?: string;
    since?: number;
    until?: number;
    limit?: number;
}
/**
 * Expand a filter into its most fine grained form
 */
export declare function expandFilter(f: ReqFilter): Array<FlatReqFilter>;
//# sourceMappingURL=RequestExpander.d.ts.map