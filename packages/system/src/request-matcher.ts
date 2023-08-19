import { NostrEvent, ReqFilter } from "./nostr";

export function eventMatchesFilter(ev: NostrEvent, filter: ReqFilter) {
  if (filter.since && ev.created_at < filter.since) {
    return false;
  }
  if (filter.until && ev.created_at > filter.until) {
    return false;
  }
  if (!(filter.ids?.includes(ev.id) ?? true)) {
    return false;
  }
  if (!(filter.authors?.includes(ev.pubkey) ?? true)) {
    return false;
  }
  if (!(filter.kinds?.includes(ev.kind) ?? true)) {
    return false;
  }
  return true;
}
