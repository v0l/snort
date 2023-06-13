import { flatFilterEq } from "./Utils";
import { FlatReqFilter } from "./RequestExpander";
import { flatMerge } from "./RequestMerger";

export function diffFilters(prev: Array<FlatReqFilter>, next: Array<FlatReqFilter>, calcRemoved?: boolean) {
  const added = [];
  const removed = [];

  for (let x = 0; x < next.length; x++) {
    const px = prev.findIndex(a => flatFilterEq(a, next[x]));
    if (px !== -1) {
      prev.splice(px, 1);
    } else {
      added.push(next[x]);
    }
  }
  if (calcRemoved) {
    for (let x = 0; x < prev.length; x++) {
      const px = next.findIndex(a => flatFilterEq(a, prev[x]));
      if (px !== -1) {
        next.splice(px, 1);
      } else {
        removed.push(prev[x]);
      }
    }
  }
  const changed = added.length > 0 || removed.length > 0;
  return {
    added: changed ? flatMerge(added) : [],
    removed: changed ? flatMerge(removed) : [],
    changed,
  };
}
