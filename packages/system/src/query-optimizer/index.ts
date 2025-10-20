import { schnorr } from "@noble/curves/secp256k1.js";
import { NostrEvent, ReqFilter } from "../nostr";
import { expandFilter } from "./request-expander";
import { flatMerge, mergeSimilar } from "./request-merger";
import { diffFilters } from "./request-splitter";
import { EventExt } from "../event-ext";
import { hexToBytes } from "@noble/hashes/utils.js";

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
  relay?: string;
  resultSetId: string;
}

export interface Optimizer {
  expandFilter(f: ReqFilter): Array<FlatReqFilter>;
  getDiff(prev: Array<ReqFilter>, next: Array<ReqFilter>): Array<FlatReqFilter>;
  flatMerge(all: Array<FlatReqFilter>): Array<ReqFilter>;
  compress(all: Array<ReqFilter>): Array<ReqFilter>;
  schnorrVerify(ev: NostrEvent): boolean;
  batchVerify(evs: Array<NostrEvent>): Array<boolean>;
}

export const DefaultOptimizer = {
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
  schnorrVerify: ev => {
    const id = EventExt.createId(ev);
    return schnorr.verify(hexToBytes(ev.sig), hexToBytes(id), hexToBytes(ev.pubkey));
  },
} as Optimizer;
