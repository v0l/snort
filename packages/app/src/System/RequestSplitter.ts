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
