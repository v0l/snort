import { RawReqFilter } from "System";

export function mergeSimilar(filters: Array<RawReqFilter>): Array<RawReqFilter> {
  const hasCriticalKeySet = (a: RawReqFilter) => {
    return a.limit !== undefined || a.since !== undefined || a.until !== undefined;
  };
  const canEasilyMerge = filters.filter(a => !hasCriticalKeySet(a));
  const cannotMerge = filters.filter(a => hasCriticalKeySet(a));
  return [...(canEasilyMerge.length > 0 ? [simpleMerge(canEasilyMerge)] : []), ...cannotMerge];
}

/**
 * Simply flatten all filters into one
 * @param filters
 * @returns
 */
export function simpleMerge(filters: Array<RawReqFilter>) {
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

  return result as RawReqFilter;
}

/**
 * Check if a filter includes another filter, as in the bigger filter will include the same results as the samller filter
 * @param bigger
 * @param smaller
 * @returns
 */
export function filterIncludes(bigger: RawReqFilter, smaller: RawReqFilter) {
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
