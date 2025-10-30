import { removeUndefined } from "@snort/shared";
import { EventExt, TaggedNostrEvent } from "@snort/system";

export function getReplies(
  from: string,
  replies: ReadonlyArray<TaggedNostrEvent>,
  chains?: Map<string, Array<string>>,
): ReadonlyArray<TaggedNostrEvent> {
  if (!from || !chains) {
    return [];
  }
  const replyIds = chains.get(from) ?? [];
  return removeUndefined(replyIds.map(r => replies.find(x => EventExt.keyOf(x) === r)));
}
