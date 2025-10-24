import { dedupe, dedupeBy, NostrPrefix } from "@snort/shared";
import { findTag } from "../utils";
import { EventBuilder, LinkScope, NostrEvent, NostrLink, Thread } from "../index";

export class Nip22 {
  /**
   * Get the root scope tag (E/A/I) or
   * create a root scope tag from the provided event
   */
  static rootScopeOf(other: NostrEvent) {
    // check if other is already scoped to thread root
    const otherLinks = NostrLink.fromTags(other.tags);
    const otherRoot = otherLinks.find(a => a.scope === LinkScope.Root);
    return otherRoot ?? NostrLink.fromEvent(other);
  }

  static replyTo(other: NostrEvent, eb: EventBuilder) {
    const linkOther = NostrLink.fromEvent(other);
    const rootScope = Nip22.linkToTag(Nip22.rootScopeOf(other));
    const rootKind = ["K", findTag(other, "K") ?? other.kind.toString()];
    const rootAuthor = ["P", findTag(other, "P") ?? other.pubkey];

    const replyScope = Nip22.linkToTag(linkOther);
    const replyKind = ["k", other.kind.toString()];
    const replyAuthor = ["p", other.pubkey];

    if (rootScope === undefined || replyScope === undefined) {
      throw new Error("RootScope or ReplyScope are undefined!");
    }

    eb.tag(rootScope);
    eb.tag(rootKind);
    eb.tag(rootAuthor);
    eb.tag(replyScope);
    eb.tag(replyKind);
    eb.tag(replyAuthor);
  }

  /**
   * Parse NIP-22 comment thread structure
   * NIP-22 uses uppercase tags (E/A/I) for root and lowercase (e/a/i) for parent
   */
  static parseThread(ev: NostrEvent): Thread | undefined {
    const links = NostrLink.fromTags(ev.tags);
    return Nip22.fromLinks(links, ev);
  }

  /**
   * Parse a NIP-22 thread from a parsed set of tag links
   */
  static fromLinks(links: Array<NostrLink>, ev: NostrEvent) {
    const ret = {
      kind: "nip22",
      mentions: [],
      pubKeys: [],
    } as Thread;

    // NIP-22: Only e/a tags are used for thread structure
    // Use LinkScope to identify root vs reply
    const replyTags = links.filter(a => [NostrPrefix.Event, NostrPrefix.Note, NostrPrefix.Address].includes(a.type));

    if (replyTags.length > 0) {
      // Find root and reply based on LinkScope
      ret.root = replyTags.find(a => a.scope === LinkScope.Root);
      ret.replyTo = replyTags.find(a => a.scope === LinkScope.Reply);
      ret.mentions = replyTags.filter(a => a.scope === LinkScope.Mention);

      // Apply kind from 'K' tag to root if present
      if (ret.root) {
        const kTag = findTag(ev, "K");
        if (kTag && ret.root.kind === undefined) {
          const kind = parseInt(kTag);
          if (!isNaN(kind)) {
            ret.root.kind = kind;
          }
        }
      }

      // Apply kind from 'k' tag to reply if present
      if (ret.replyTo) {
        const kTag = findTag(ev, "k");
        if (kTag && ret.replyTo.kind === undefined) {
          const kind = parseInt(kTag);
          if (!isNaN(kind)) {
            ret.replyTo.kind = kind;
          }
        }
      }

      // remove duplicate pubkey mentions
      ret.pubKeys = dedupeBy(
        links.filter(a => [NostrPrefix.PublicKey, NostrPrefix.Profile].includes(a.type)),
        n => n.id,
      );

      // if no root or reply, not a thread
      if (ret.root === undefined && ret.replyTo === undefined) {
        return undefined;
      }

      return ret;
    } else {
      return undefined;
    }
  }

  /**
   * Create a NIP-22 tag from an object link
   */
  static linkToTag(link: NostrLink) {
    // TODO: implement
  }
}
