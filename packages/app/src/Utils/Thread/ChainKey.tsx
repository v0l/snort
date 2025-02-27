import { EventKind, Nip10, NostrLink, TaggedNostrEvent } from "@snort/system";

/**
 * Get the chain key as a reply event
 *
 * ie. Get the key for which this event is replying to
 */
export function replyChainKey(ev: TaggedNostrEvent) {
  if (ev.kind !== EventKind.Comment) {
    const t = Nip10.parseThread(ev);
    const tag = t?.replyTo ?? t?.root;
    return tag?.tagKey;
  } else {
    const k = ev.tags.find(t => ["e", "a", "i"].includes(t[0]));
    return k?.[1];
  }
}

/**
 * Get the chain key of this event
 *
 * ie. Get the key which ties replies to this event
 */
export function chainKey(ev: TaggedNostrEvent) {
  const link = NostrLink.fromEvent(ev);
  return link.tagKey;
}
