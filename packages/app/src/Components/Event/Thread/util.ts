import { TaggedNostrEvent, u256 } from "@snort/system";

export function getReplies(from: u256, chains?: Map<u256, Array<TaggedNostrEvent>>): Array<TaggedNostrEvent> {
  if (!from || !chains) {
    return [];
  }
  const replies = chains.get(from);
  return replies ? replies : [];
}
