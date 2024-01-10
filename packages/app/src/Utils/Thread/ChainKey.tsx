import { unwrap } from "@snort/shared";
import { EventExt, NostrLink, TaggedNostrEvent } from "@snort/system";

/**
 * Get the chain key as a reply event
 */
export function replyChainKey(ev: TaggedNostrEvent) {
  const t = EventExt.extractThread(ev);
  return t?.replyTo?.value ?? t?.root?.value;
}

/**
 * Get the chain key of this event
 */
export function chainKey(ev: TaggedNostrEvent) {
  const link = NostrLink.fromEvent(ev);
  return unwrap(link.toEventTag())[1];
}
