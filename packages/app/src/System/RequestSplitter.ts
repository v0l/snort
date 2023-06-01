import { RawReqFilter } from "System";

// Critical keys changing means the entire filter has changed
export const CriticalKeys = ["since", "until", "limit"];

export function diffFilters(a: Array<RawReqFilter>, b: Array<RawReqFilter>) {
  const result: Array<RawReqFilter> = [];
  let anyChanged = false;
  for (const [i, bN] of b.entries()) {
    const prev: Record<string, string | number | string[] | number[] | undefined> = a[i];
    if (!prev) {
      result.push(bN);
      anyChanged = true;
    } else {
      let anyCriticalKeyChanged = false;
      for (const [k, v] of Object.entries(bN)) {
        if (Array.isArray(v)) {
          const prevArray = prev[k] as Array<string | number> | undefined;
          const thisArray = v as Array<string | number>;
          const added = thisArray.filter(a => !prevArray?.includes(a));
          // support adding new values to array, removing values is ignored since we only care about getting new values
          result[i] = { ...result[i], [k]: added.length === 0 ? prevArray ?? [] : added };
          if (added.length > 0) {
            anyChanged = true;
          }
        } else if (prev[k] !== v) {
          result[i] = { ...result[i], [k]: v };
          if (CriticalKeys.includes(k)) {
            anyCriticalKeyChanged = anyChanged = true;
            break;
          }
        }
      }
      if (anyCriticalKeyChanged) {
        result[i] = bN;
      }
    }
  }

  return {
    filters: result,
    changed: anyChanged,
  };
}

/**
 * Expand a filter into its most fine grained form
 */
export function expandFilter(f: RawReqFilter): Array<RawReqFilter> {
  const ret: Array<RawReqFilter> = [];
  const src = Object.entries(f);
  const keys = src.filter(([, v]) => Array.isArray(v)).map(a => a[0]);
  const props = src.filter(([, v]) => !Array.isArray(v));

  function generateCombinations(index: number, currentCombination: RawReqFilter) {
    if (index === keys.length) {
      ret.push(currentCombination);
      return;
    }

    const key = keys[index];
    const values = (f as Record<string, Array<string | number>>)[key];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const updatedCombination = { ...currentCombination, [key]: [value] };
      generateCombinations(index + 1, updatedCombination);
    }
  }

  generateCombinations(0, {
    ...Object.fromEntries(props),
  });

  return ret;
}
