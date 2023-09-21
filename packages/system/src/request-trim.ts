import { ReqFilter } from "nostr";

/**
 * Remove empty filters, filters which would result in no results
 */
export function trimFilters(filters: Array<ReqFilter>) {
  const fNew = [];
  for (const f of filters) {
    const ent = Object.entries(f).filter(([, v]) => Array.isArray(v));
    if (ent.every(([, v]) => (v as Array<string | number>).length > 0)) {
      fNew.push(f);
    }
  }
  return fNew;
}
