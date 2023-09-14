import { ParsedFragment, transformText } from "@snort/system";

const TextCache = new Map<string, Array<ParsedFragment>>();

export function transformTextCached(id: string, content: string, tags: Array<Array<string>>) {
    const cached = TextCache.get(id);
    if (cached) return cached;
    const newCache = transformText(content, tags);
    TextCache.set(id, newCache);
    return newCache;
}

export function useTextTransformer(id: string, content: string, tags: Array<Array<string>>) {
    return transformTextCached(id, content, tags);
}