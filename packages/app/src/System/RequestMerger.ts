import { ReqFilter } from "System";
import { FlatReqFilter } from "./RequestExpander";
import { distance } from "./Util";

/**
 * Keys which can change the entire meaning of the filter outside the array types
 */
const DiscriminatorKeys = ["since", "until", "limit", "search"];

export function canMergeFilters(a: any, b: any): boolean {
  for (const key of DiscriminatorKeys) {
    if (key in a || key in b) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
  }

  return true;
}

export function mergeSimilar(filters: Array<ReqFilter>): Array<ReqFilter> {
  const ret = [];

  while (filters.length > 0) {
    const current = filters.shift()!;
    const mergeSet = [current];
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      if (mergeSet.every(v => canMergeFilters(v, f) && distance(v, f) === 1)) {
        mergeSet.push(filters.splice(i, 1)[0]);
        i--;
      }
    }
    ret.push(simpleMerge(mergeSet));
  }
  return ret;
}

/**
 * Simply flatten all filters into one
 * @param filters
 * @returns
 */
export function simpleMerge(filters: Array<ReqFilter>) {
  const result: any = {};

  filters.forEach(filter => {
    Object.entries(filter).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (result[key] === undefined) {
          result[key] = [...value];
        } else {
          result[key] = [...new Set([...result[key], ...value])];
        }
      } else {
        result[key] = value;
      }
    });
  });

  return result as ReqFilter;
}

/**
 * Check if a filter includes another filter, as in the bigger filter will include the same results as the samller filter
 * @param bigger
 * @param smaller
 * @returns
 */
export function filterIncludes(bigger: ReqFilter, smaller: ReqFilter) {
  const outside = bigger as Record<string, Array<string | number> | number>;
  for (const [k, v] of Object.entries(smaller)) {
    if (outside[k] === undefined) {
      return false;
    }
    if (Array.isArray(v) && v.some(a => !(outside[k] as Array<string | number>).includes(a))) {
      return false;
    }
    if (typeof v === "number") {
      if (k === "since" && (outside[k] as number) > v) {
        return false;
      }
      if (k === "until" && (outside[k] as number) < v) {
        return false;
      }
      // limit cannot be checked and is ignored
    }
  }
  return true;
}

/**
 * Merge expanded flat filters into combined concise filters
 * @param all
 * @returns
 */
export function flatMerge(all: Array<FlatReqFilter>): Array<ReqFilter> {
  let ret: Array<ReqFilter> = [];

  // to compute filters which can be merged we need to calucate the distance change between each filter
  // then we can merge filters which are exactly 1 change diff from each other

  function mergeFiltersInSet(filters: Array<FlatReqFilter>) {
    const result: any = {};

    filters.forEach(f => {
      const filter = f as Record<string, string | number>;
      Object.entries(filter).forEach(([key, value]) => {
        if (!DiscriminatorKeys.includes(key)) {
          if (result[key] === undefined) {
            result[key] = [value];
          } else {
            result[key] = [...new Set([...result[key], value])];
          }
        } else {
          result[key] = value;
        }
      });
    });

    return result as ReqFilter;
  }

  // reducer, kinda verbose
  while (all.length > 0) {
    const currentFilter = all.shift()!;
    const mergeSet = [currentFilter];

    for (let i = 0; i < all.length; i++) {
      const f = all[i];

      if (mergeSet.every(a => canMergeFilters(a, f) && distance(a, f) === 1)) {
        mergeSet.push(all.splice(i, 1)[0]);
        i--;
      }
    }
    ret.push(mergeFiltersInSet(mergeSet));
  }

  while (true) {
    const n = mergeSimilar([...ret]);
    if (n.length === ret.length) {
      break;
    }
    ret = n;
  }
  return ret;
}
