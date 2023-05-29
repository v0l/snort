import { RawReqFilter } from "@snort/nostr";

export function mergeSimilar(filters: Array<RawReqFilter>): Array<RawReqFilter> {
  const hasCriticalKeySet = (a: RawReqFilter) => {
    return a.limit !== undefined || a.since !== undefined || a.until !== undefined;
  };
  const canEasilyMerge = filters.filter(a => !hasCriticalKeySet(a));
  const cannotMerge = filters.filter(a => hasCriticalKeySet(a));
  return [...(canEasilyMerge.length > 0 ? [simpleMerge(canEasilyMerge)] : []), ...cannotMerge];
}

function simpleMerge(filters: Array<RawReqFilter>) {
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
        throw new Error("Cannot simple merge with non-array filter properties");
      }
    });
  });

  return result as RawReqFilter;
}
