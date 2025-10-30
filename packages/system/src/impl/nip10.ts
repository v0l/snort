import { dedupeBy, NostrPrefix } from "@snort/shared";
import { NostrEvent, NostrLink, Thread, EventBuilder, LinkScope, TaggedNostrEvent } from "..";

/**
 * Utility class which exports functions used in NIP-10
 */
export class Nip10 {
  /**
   * Reply to an event using NIP-10 tagging
   */
  static replyTo(ev: TaggedNostrEvent, eb: EventBuilder) {
    const link = NostrLink.fromEvent(ev);
    const thread = Nip10.parseThread(ev);
    if (thread) {
      // get the root tag or the reply tag of the note you're replying to
      // some clients didnt add the root tag when replying directly to the root note
      const rootOrReplyAsRoot = (thread.root || thread.replyTo)!;
      eb.tag(Nip10.linkToTag(rootOrReplyAsRoot, LinkScope.Root));
      eb.tag(Nip10.linkToTag(link, LinkScope.Reply));

      for (const pk of thread.pubKeys) {
        // skip own pubkey and authors pubkey
        // authors p tag will be added at the end
        if (pk.id === eb.pubkey || pk.id === ev.pubkey) {
          continue;
        }
        eb.tag(Nip10.linkToTag(pk));
      }
    } else {
      eb.tag(Nip10.linkToTag(link, LinkScope.Root));
    }
    // always tag the author of the event you're replying to
    if (ev.pubkey !== eb.pubkey) {
      const authorLink = NostrLink.publicKey(ev.pubkey, ev.relays);
      eb.tag(Nip10.linkToTag(authorLink));
    }
  }

  static parseThread(ev: NostrEvent) {
    const links = NostrLink.fromTags(ev.tags);
    return Nip10.fromLinks(links);
  }

  /**
   * Parse a thread from a parsed set of tag links
   */
  static fromLinks(links: Array<NostrLink>) {
    const ret = {
      kind: "nip10",
      mentions: [],
      pubKeys: [],
    } as Thread;

    // NIP-10: Only e and a tags are used for thread structure (positional or marked)
    const replyTags = links.filter(a => [NostrPrefix.Event, NostrPrefix.Note, NostrPrefix.Address].includes(a.type));
    if (replyTags.length > 0) {
      const marked = replyTags.some(a => a.scope);
      if (!marked) {
        ret.root = replyTags[0];
        ret.root.scope = LinkScope.Root;
        if (replyTags.length > 1) {
          ret.replyTo = replyTags[replyTags.length - 1];
          ret.replyTo.scope = LinkScope.Reply;
        }
        if (replyTags.length > 2) {
          ret.mentions = replyTags.slice(1, -1);
          ret.mentions.forEach(a => (a.scope = LinkScope.Mention));
        }
      } else {
        const root = replyTags.find(a => a.scope === LinkScope.Root);
        const reply = replyTags.find(a => a.scope === LinkScope.Reply);
        ret.root = root;
        ret.replyTo = reply;
        ret.mentions = replyTags.filter(a => a.scope === LinkScope.Mention);
      }

      // if no root or reply, not a thread
      if (ret.root === undefined && ret.replyTo === undefined) {
        return undefined;
      }

      // extract all pubkey mentions from tags
      const pubKeyLinks = links.filter(a => [NostrPrefix.PublicKey, NostrPrefix.Profile].includes(a.type));
      // remove duplicate pubkey mentions
      ret.pubKeys = dedupeBy(pubKeyLinks, n => n.id);

      return ret;
    } else {
      return undefined;
    }
  }

  /**
   * Convert a link to an event tag
   */
  static linkToTag(link: NostrLink, withScope?: LinkScope) {
    const suffix: Array<string> = [];
    if (link.relays && link.relays.length > 0) {
      suffix.push(link.relays[0]);
    }
    const scope = withScope ?? link.scope;
    const markerString = Nip10.scopeToMarker(scope);
    if (markerString) {
      if (suffix[0] === undefined) {
        suffix.push(""); // empty relay hint
      }
      suffix.push(markerString);
    }

    const isQ = scope === LinkScope.Quote;
    if (link.type === NostrPrefix.PublicKey || link.type === NostrPrefix.Profile) {
      return ["p", link.id, ...suffix];
    } else if (link.type === NostrPrefix.Note || link.type === NostrPrefix.Event) {
      if (link.author) {
        if (suffix[0] === undefined) {
          suffix.push(""); // empty relay hint
        }
        if (suffix[1] === undefined) {
          suffix.push(""); // empty marker
        }
        suffix.push(link.author);
      }
      return [isQ ? "q" : "e", link.id, ...suffix];
    } else if (link.type === NostrPrefix.Address) {
      return [isQ ? "q" : "a", `${link.kind}:${link.author}:${link.id}`, ...suffix];
    }
    throw new Error("Invalid link");
  }

  /**
   * Converts a link scope to a marker string
   */
  static scopeToMarker(scope?: LinkScope) {
    switch (scope) {
      case LinkScope.Root:
        return "root" as const;
      case LinkScope.Reply:
        return "reply" as const;
      case LinkScope.Mention:
        return "mention" as const;
    }
  }
}
