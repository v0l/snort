import { sha256 } from "@snort/shared";
import { FlatReqFilter } from ".";
import { ReqFilter } from "../nostr";

/**
 * Expand a filter into its most fine grained form
 */
export function expandFilter(f: ReqFilter): Array<FlatReqFilter> {
  const ret: Array<FlatReqFilter> = [];
  const src = Object.entries(f);

  const id = resultSetId(f);

  // Filter entries that are arrays and keep the rest as is
  const arrays: [string, Array<string> | Array<number>][] = src.filter(([, value]) => Array.isArray(value)) as [
    string,
    Array<string> | Array<number>,
  ][];
  const constants = Object.fromEntries(src.filter(([, value]) => !Array.isArray(value))) as {
    [key: string]: string | number | undefined;
  };

  // Recursive function to compute cartesian product
  function cartesianProduct(arr: [string, Array<string> | Array<number>][], temp: [string, any][] = []) {
    if (arr.length === 0) {
      ret.push(createFilterObject(temp, constants, id));
      return;
    }
    for (let i = 0; i < arr[0][1].length; i++) {
      cartesianProduct(arr.slice(1), temp.concat([[arr[0][0], arr[0][1][i]]]));
    }
  }

  // Create filter object from the combination
  function createFilterObject(
    combination: [string, any][],
    constants: { [key: string]: string | number | undefined },
    resultId: string,
  ) {
    let filterObject = { ...Object.fromEntries(combination), ...constants } as FlatReqFilter;
    filterObject.resultSetId = resultId;
    return filterObject;
  }

  cartesianProduct(arrays);
  return ret;
}

function resultSetId(f: ReqFilter) {
  if (f.limit !== undefined || f.since !== undefined || f.until !== undefined) {
    const arrays = Object.entries(f)
      .filter(([, a]) => Array.isArray(a))
      .map(a => a as [string, Array<string | number>])
      .sort();
    const input = arrays.map(([, a]) => a.join(",")).join(",");
    return sha256(input);
  }
  return "";
}
