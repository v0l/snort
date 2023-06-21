import { NostrEvent, ReqFilter } from "./nostr";

export function eventMatchesFilter(ev: NostrEvent, filter: ReqFilter) {
  if (!(filter.ids?.includes(ev.id) ?? false)) {
    return false;
  }
  if (!(filter.authors?.includes(ev.pubkey) ?? false)) {
    return false;
  }
  if (!(filter.kinds?.includes(ev.kind) ?? false)) {
    return false;
  }
  if (filter.since && ev.created_at < filter.since) {
    return false;
  }
  if (filter.until && ev.created_at > filter.until) {
    return false;
  }
  return true;
}
