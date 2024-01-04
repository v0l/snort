import LRUSet from "@snort/shared/src/LRUSet";

export const seenEvents = new LRUSet<string>(2000);