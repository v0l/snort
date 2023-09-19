import { ReqFilter } from "nostr";

/**
 * Remove empty filters, filters which would result in no results
 */
export function trimFilters(filters: Array<ReqFilter>) {
  const fNew = [];
  for (const f of filters) {
    let arrays = 0;
    for (const [k, v] of Object.entries(f)) {
      if (Array.isArray(v)) {
        arrays++;
        if (v.length === 0) {
          delete f[k];
        }
      }
    }

    if (arrays > 0 && Object.entries(f).some(v => Array.isArray(v))) {
      fNew.push(f);
    } else if (arrays === 0) {
      fNew.push(f);
    }
  }
  return fNew;
}
