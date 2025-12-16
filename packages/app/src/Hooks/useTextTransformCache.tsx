import { type ParsedFragment, transformText } from "@snort/system";
import { LRUCache } from "typescript-lru-cache";

const TextCache = new LRUCache<string, Array<ParsedFragment>>({
  maxSize: 1000,
});

export function transformTextCached(id: string, content: string, tags: Array<Array<string>>): Array<ParsedFragment> {
  if (content.length > 0) {
    const cached = TextCache.get(id);
    if (cached) return cached;
    const newCache = transformText(content, tags);
    TextCache.set(id, newCache);
    return newCache;
  }
  return [];
}

export function useTextTransformer(id: string, content: string, tags: Array<Array<string>>) {
  return transformTextCached(id, content, tags);
}
