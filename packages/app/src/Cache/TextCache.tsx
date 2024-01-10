import { ParsedFragment } from "@snort/system";
import { LRUCache } from "typescript-lru-cache";

export const TextCache = new LRUCache<string, Array<ParsedFragment>>({
  maxSize: 1000,
});
