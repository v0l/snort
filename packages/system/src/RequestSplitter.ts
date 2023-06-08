import { ReqFilter } from ".";
import { flatReqFilterEq } from "./Util";
import { expandFilter } from "./RequestExpander";
import { flatMerge } from "./RequestMerger";

export function diffFilters(prev: Array<ReqFilter>, next: Array<ReqFilter>) {
  const prevExpanded = prev.flatMap(expandFilter);
  const nextExpanded = next.flatMap(expandFilter);

  const added = flatMerge(nextExpanded.filter(a => !prevExpanded.some(b => flatReqFilterEq(a, b))));
  const removed = flatMerge(prevExpanded.filter(a => !nextExpanded.some(b => flatReqFilterEq(a, b))));

  return {
    added,
    removed,
    changed: added.length > 0 || removed.length > 0,
  };
}
