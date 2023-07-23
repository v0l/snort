import { ReqFilter } from "./nostr";

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

/**
 * Expand a filter into its most fine grained form
 */
export function expandFilter(f: ReqFilter): Array<FlatReqFilter> {
  const ret: Array<FlatReqFilter> = [];
  const src = Object.entries(f);
  const keys = src.filter(([, v]) => Array.isArray(v)).map(a => a[0]);
  const props = src.filter(([, v]) => !Array.isArray(v));

  function generateCombinations(index: number, currentCombination: FlatReqFilter) {
    if (index === keys.length) {
      ret.push(currentCombination);
      return;
    }

    const key = keys[index];
    const values = (f as Record<string, Array<string | number>>)[key];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const updatedCombination = { ...currentCombination, [key]: value };
      generateCombinations(index + 1, updatedCombination);
    }
  }

  generateCombinations(0, {
    keys: keys.length,
    ...Object.fromEntries(props),
  });

  return ret;
}
