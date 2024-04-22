import { Nip10, NostrLink, TaggedNostrEvent } from "@snort/system";

/**
 * Get the chain key as a reply event
 *
 * ie. Get the key for which this event is replying to
 */
export function replyChainKey(ev: TaggedNostrEvent) {
  const t = Nip10.parseThread(ev);
  const tag = t?.replyTo ?? t?.root;
  return tag?.tagKey;
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
