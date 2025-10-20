import { findTag } from "../utils";
import { EventBuilder, NostrEvent, NostrLink } from "../index";

export class Nip22 {
  /**
   * Get the root scope tag (E/A/I) or
   * create a root scope tag from the provided event
   */
  static rootScopeOf(other: NostrEvent) {
    const linkOther = NostrLink.fromEvent(other);
    return other.tags.find(t => ["E", "A", "I"].includes(t[0])) ?? linkOther.toEventTagNip22(true)!;
  }

  static replyTo(other: NostrEvent, eb: EventBuilder) {
    const linkOther = NostrLink.fromEvent(other);
    const rootScope = Nip22.rootScopeOf(other);
    const rootKind = ["K", findTag(other, "K") ?? other.kind.toString()];
    const rootAuthor = ["P", findTag(other, "P") ?? other.pubkey];

    const replyScope = linkOther.toEventTagNip22(false);
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
}
