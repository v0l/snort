import { ReqFilter } from "../nostr";
import { expandFilter } from "./request-expander";
import { flatMerge, mergeSimilar } from "./request-merger";
import { diffFilters } from "./request-splitter";

export interface FlatReqFilter {
  keys: number;
  ids?: string;
  authors?: string;
  kinds?: number;
  "#e"?: string;
  "#p"?: string;
  "#t"?: string;
  "#d"?: string;
  "#r"?: string;
  search?: string;
  since?: number;
  until?: number;
  limit?: number;
}

export interface QueryOptimizer {
  expandFilter(f: ReqFilter): Array<FlatReqFilter>;
  getDiff(prev: Array<ReqFilter>, next: Array<ReqFilter>): Array<FlatReqFilter>;
  flatMerge(all: Array<FlatReqFilter>): Array<ReqFilter>;
  compress(all: Array<ReqFilter>): Array<ReqFilter>;
}

export const DefaultQueryOptimizer = {
  expandFilter: (f: ReqFilter) => {
    return expandFilter(f);
  },
  getDiff: (prev: Array<ReqFilter>, next: Array<ReqFilter>) => {
    const diff = diffFilters(
      prev.flatMap(a => expandFilter(a)),
      next.flatMap(a => expandFilter(a)),
    );
    return diff.added;
  },
  flatMerge: (all: Array<FlatReqFilter>) => {
    return flatMerge(all);
  },
  compress: (all: Array<ReqFilter>) => {
    return mergeSimilar(all);
  },
} as QueryOptimizer;
