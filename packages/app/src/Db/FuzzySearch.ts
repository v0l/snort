import { CachedMetadata } from "@snort/system";
import Fuse from "fuse.js";

export type FuzzySearchResult = {
  pubkey: string;
  name?: string;
  display_name?: string;
  nip05?: string;
};

const fuzzySearch = new Fuse<FuzzySearchResult>([], {
  keys: ["name", "display_name", { name: "nip05", weight: 0.5 }],
  threshold: 0.3,
  // sortFn here?
});

const profileTimestamps = new Map<string, number>(); // is this somewhere in cache?

export const addEventToFuzzySearch = ev => {
  if (ev.kind !== 0) {
    return;
  }
  queueMicrotask(() => {
    const existing = profileTimestamps.get(ev.pubkey);
    if (existing) {
      if (existing > ev.created_at) {
        return;
      }
      fuzzySearch.remove(doc => doc.pubkey === ev.pubkey);
    }
    profileTimestamps.set(ev.pubkey, ev.created_at);
    try {
      const data = JSON.parse(ev.content);
      if (ev.pubkey && (data.name || data.display_name || data.nip05)) {
        data.pubkey = ev.pubkey;
        fuzzySearch.add(data);
      }
    } catch (e) {
      console.error(e);
    }
  });
};

export const addCachedMetadataToFuzzySearch = (profile: CachedMetadata) => {
  queueMicrotask(() => {
    const existing = profileTimestamps.get(profile.pubkey);
    if (existing) {
      if (existing > profile.created) {
        return;
      }
      fuzzySearch.remove(doc => doc.pubkey === profile.pubkey);
    }
    profileTimestamps.set(profile.pubkey, profile.created);
    if (profile.pubkey && (profile.name || profile.display_name || profile.nip05)) {
      fuzzySearch.add(profile);
    }
  });
};

export default fuzzySearch;
