import { flatFilterEq } from "./Utils";
import { FlatReqFilter } from "./RequestExpander";
import { flatMerge } from "./RequestMerger";

export function diffFilters(prev: Array<FlatReqFilter>, next: Array<FlatReqFilter>, calcRemoved?: boolean) {
  const added = next.filter(a => !prev.some(b => flatFilterEq(a, b)));
  const removed = calcRemoved ? prev.filter(a => !next.some(b => flatFilterEq(a, b))) : [];

  const changed = added.length > 0 || removed.length > 0;
  return {
    added: changed ? flatMerge(added) : [],
    removed: changed ? flatMerge(removed) : [],
    changed,
  };
}
