import { distance } from "./Utils";
import { ReqFilter } from ".";
import { FlatReqFilter } from "./RequestExpander";

/**
 * Keys which can change the entire meaning of the filter outside the array types
 */
const DiscriminatorKeys = ["since", "until", "limit", "search"];

export function canMergeFilters(a: FlatReqFilter | ReqFilter, b: FlatReqFilter | ReqFilter): boolean {
  const aObj = a as Record<string, string | number | undefined>;
  const bObj = b as Record<string, string | number | undefined>;
  for (const key of DiscriminatorKeys) {
    if (aObj[key] !== bObj[key]) {
      return false;
    }
  }
  return distance(a, b) <= 1;
}

export function mergeSimilar(filters: Array<ReqFilter>): Array<ReqFilter> {
  const ret = [];

  const fCopy = [...filters];
  while (fCopy.length > 0) {
    const current = fCopy.shift()!;
    const mergeSet = [current];
    for (let i = 0; i < fCopy.length; i++) {
      const f = fCopy[i];
      if (!mergeSet.some(v => !canMergeFilters(v, f))) {
        mergeSet.push(fCopy.splice(i, 1)[0]);
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
          const toAdd = value.filter(a => !result[key].includes(a));
          result[key].push(...toAdd);
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
    return filters.reduce((acc, a) => {
      Object.entries(a).forEach(([k, v]) => {
        if (k === "keys") return;
        if (DiscriminatorKeys.includes(k)) {
          acc[k] = v;
        } else {
          acc[k] ??= [];
          if (!acc[k].includes(v)) {
            acc[k].push(v);
          }
        }
      })
      return acc;
    }, {} as any) as ReqFilter;
  }

  // reducer, kinda verbose
  while (all.length > 0) {
    const currentFilter = all.shift()!;
    const mergeSet = [currentFilter];

    for (let i = 0; i < all.length; i++) {
      const f = all[i];

      if (mergeSet.every(a => canMergeFilters(a, f))) {
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
