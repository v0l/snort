import { unwrap } from "@snort/shared";
import { EventExt, type TaggedNostrEvent, type NostrEvent } from "..";
import { findTag } from "../utils";

/**
 * Implementing [NIP-25](https://github.com/nostr-protocol/nips/blob/master/25.md) reactions
 */
export class Nip25 {
  /**
   * Create an event reaction tag
   */
  static reactToEvent(ev: TaggedNostrEvent | NostrEvent) {
    const relayHint = "relays" in ev ? (ev.relays?.[0] ?? "") : "";
    if (EventExt.isAddressable(ev.kind)) {
      return ["a", `${ev.kind}:${ev.pubkey}:${unwrap(findTag(ev, "d"))}`, relayHint, ev.pubkey];
    } else {
      return ["e", ev.id, relayHint, ev.pubkey];
    }
  }
}
