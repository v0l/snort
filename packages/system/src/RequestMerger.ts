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
    if (key in aObj || key in bObj) {
      if (aObj[key] !== bObj[key]) {
        return false;
      }
    }
  }
  let flag = false;
  if (!equalProp(a.ids, b.ids)) {
    flag = true;
  }
  if (!equalProp(a.authors, b.authors)) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a.kinds, b.kinds)) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a.limit, b.limit)) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a.until, b.until)) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a.since, b.since)) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a.search, b.search)) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a["#e"], b["#e"])) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a["#p"], b["#p"])) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a["#d"], b["#d"])) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a["#r"], b["#r"])) {
    if (flag) return false;
    flag = true;
  }
  if (!equalProp(a["#t"], b["#t"])) {
    if (flag) return false;
    flag = true;
  }
  return true;
}

function equalProp(a: string | number | Array<string | number> | undefined, b: string | number | Array<string | number> | undefined) {
  if ((a !== undefined && b === undefined) || (a === undefined && b !== undefined)) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    if (!a.every(v => b.includes(v))) {
      return false;
    }
  }
  return a === b;
}

export function mergeSimilar(filters: Array<ReqFilter>): Array<ReqFilter> {
  console.time("mergeSimilar");
  const ret = [];

  const fCopy = [...filters];
  while (fCopy.length > 0) {
    const current = fCopy.shift()!;
    const mergeSet = [current];
    for (let i = 0; i < fCopy.length; i++) {
      const f = fCopy[i];
      if (mergeSet.every(v => canMergeFilters(v, f))) {
        mergeSet.push(fCopy.splice(i, 1)[0]);
        i--;
      }
    }
    ret.push(simpleMerge(mergeSet));
  }
  console.timeEnd("mergeSimilar");
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
  console.time("flatMerge");
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
  console.timeEnd("flatMerge");
  console.debug(ret);
  return ret;
}
