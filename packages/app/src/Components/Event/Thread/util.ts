import { TaggedNostrEvent } from "@snort/system";

export function getReplies(from: string, chains?: Map<string, Array<TaggedNostrEvent>>): Array<TaggedNostrEvent> {
  if (!from || !chains) {
    return [];
  }
  const replies = chains.get(from);
  return replies ? replies : [];
}
