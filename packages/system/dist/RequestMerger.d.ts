import { ReqFilter } from ".";
import { FlatReqFilter } from "./RequestExpander";
export declare function canMergeFilters(a: FlatReqFilter | ReqFilter, b: FlatReqFilter | ReqFilter): boolean;
export declare function mergeSimilar(filters: Array<ReqFilter>): Array<ReqFilter>;
/**
 * Simply flatten all filters into one
 * @param filters
 * @returns
 */
export declare function simpleMerge(filters: Array<ReqFilter>): ReqFilter;
/**
 * Check if a filter includes another filter, as in the bigger filter will include the same results as the samller filter
 * @param bigger
 * @param smaller
 * @returns
 */
export declare function filterIncludes(bigger: ReqFilter, smaller: ReqFilter): boolean;
/**
 * Merge expanded flat filters into combined concise filters
 * @param all
 * @returns
 */
export declare function flatMerge(all: Array<FlatReqFilter>): Array<ReqFilter>;
//# sourceMappingURL=RequestMerger.d.ts.map