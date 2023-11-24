import Fuse from "fuse.js";
import { socialGraphInstance } from "@snort/system";
import { System } from ".";

export type FuzzySearchResult = {
  pubkey: string;
  name?: string;
  username?: string;
  nip05?: string;
};

export const fuzzySearch = new Fuse<FuzzySearchResult>([], {
  keys: ["name", "username", { name: "nip05", weight: 0.5 }],
  threshold: 0.3,
  // sortFn here?
});

const profileTimestamps = new Map<string, number>(); // is this somewhere in cache?

System.on("event", ev => {
  if (ev.kind === 0) {
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
      if (ev.pubkey && (data.name || data.username || data.nip05)) {
        data.pubkey = ev.pubkey;
        fuzzySearch.add(data);
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (ev.kind === 3) {
    socialGraphInstance.handleFollowEvent(ev);
  }
});
