import { NostrPrefix } from "@snort/shared";
import { LinkScope, NostrLink } from "../nostr-link";

/**
 * [NIP-18](https://github.com/nostr-protocol/nips/blob/master/18.md) specific methods
 */
export class Nip18 {
  static linkToTag(link: NostrLink) {
    if (link.scope !== LinkScope.Quote) {
      throw new Error("Link is not a quote");
    }

    const ret = ["q", link.tagKey];
    if (link.relays && link.relays.length > 0) {
      ret.push(link.relays[0]);
    }

    // Per NIP-18 spec: only add pubkey for regular events (not addresses)
    // Addresses already encode the author in tagKey as kind:author:d-tag
    const isRegularEvent = link.type === NostrPrefix.Event || link.type === NostrPrefix.Note;
    if (link.author && isRegularEvent) {
      if (ret.length === 2) {
        ret.push(""); // empty relay
      }
      ret.push(link.author);
    }

    return ret;
  }
}
