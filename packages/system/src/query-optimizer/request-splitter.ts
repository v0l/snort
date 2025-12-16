import { flatFilterEq } from "../utils";
import type { FlatReqFilter } from ".";

export function diffFilters(prev: Array<FlatReqFilter>, next: Array<FlatReqFilter>, calcRemoved?: boolean) {
  const added = [];
  const removed = [];

  for (const n of next) {
    const px = prev.findIndex(a => flatFilterEq(a, n));
    if (px !== -1) {
      prev.splice(px, 1);
    } else {
      added.push(n);
    }
  }
  if (calcRemoved) {
    for (const p of prev) {
      const px = next.findIndex(a => flatFilterEq(a, p));
      if (px !== -1) {
        next.splice(px, 1);
      } else {
        removed.push(p);
      }
    }
  }
  const changed = added.length > 0 || removed.length > 0;
  return {
    added: changed ? added : [],
    removed: changed ? removed : [],
    changed,
  };
}
