import { ReqFilter } from ".";
import { deepEqual } from "./Util";
import { expandFilter } from "./RequestExpander";
import { flatMerge } from "./RequestMerger";

export function diffFilters(prev: Array<ReqFilter>, next: Array<ReqFilter>) {
  const prevExpanded = prev.flatMap(expandFilter);
  const nextExpanded = next.flatMap(expandFilter);

  const added = flatMerge(nextExpanded.filter(a => !prevExpanded.some(b => deepEqual(a, b))));
  const removed = flatMerge(prevExpanded.filter(a => !nextExpanded.some(b => deepEqual(a, b))));

  return {
    added,
    removed,
    changed: added.length > 0 || removed.length > 0,
  };
}
