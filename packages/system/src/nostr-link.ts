import {
  bech32ToHex,
  hexToBech32,
  isHex,
  removeUndefined,
  unwrap,
  Bech32Regex,
  sanitizeRelayUrl,
  appendDedupe,
  NostrPrefix,
  encodeTLV,
  decodeTLV,
  TLVEntryType,
  isPrefixTlvIdHex,
} from "@snort/shared";
import { EventExt, EventKind, Nip10, type NostrEvent, type TaggedNostrEvent } from ".";
import { findTag } from "./utils";
import { hexToBytes } from "@noble/hashes/utils.js";
import { utf8ToBytes } from "@noble/ciphers/utils.js";

/**
 * An object which can be stored in a nostr event as a tag
 */
export interface ToNostrEventTag {
  toEventTag(): Array<string> | undefined;
  equals(other: ToNostrEventTag): boolean;
}

/**
 * A hashtag ["t", ... ] tag
 */
export class NostrHashtagLink implements ToNostrEventTag {
  constructor(readonly tag: string) {}

  equals(other: ToNostrEventTag): boolean {
    const otherTag = other.toEventTag();
    return otherTag?.at(0) === "t" && otherTag?.at(1) === this.tag;
  }

  toEventTag() {
    return ["t", this.tag];
  }
}

/**
 * A generic tag which could not be specifically parsed
 */
export class UnknownTag implements ToNostrEventTag {
  constructor(readonly value: Array<string>) {}

  equals(other: ToNostrEventTag): boolean {
    const otherTag = other.toEventTag();
    return otherTag?.at(0) === this.value.at(0) && otherTag?.at(1) === this.value.at(1);
  }

  toEventTag(): string[] | undefined {
    return this.value;
  }
}

/**
 * Link scope for reply tags
 */
export enum LinkScope {
  /**
   * Link points to the root note of the thread
   */
  Root = "root",
  /**
   * Link points to the note being replied to
   */
  Reply = "reply",
  /**
   * Link mentions another object without directly replying
   */
  Mention = "mention",
  /**
   * Link mentions another object (`q` tag)
   */
  Quote = "quote",
}

/**
 * A link to another object on Nostr
 */
export class NostrLink implements ToNostrEventTag {
  /**
   * A nostr kind number (only a hint)
   */
  kind?: EventKind;
  /**
   * Link scope for tagging
   */
  scope?: LinkScope;

  constructor(
    readonly type: NostrPrefix,
    readonly id: string,
    kind?: number,
    readonly author?: string,
    readonly relays?: Array<string>,
    scope?: LinkScope | string,
  ) {
    if (isPrefixTlvIdHex(type) && !isHex(id)) {
      throw new Error(`ID must be hex: ${JSON.stringify(id)}`);
    }
    if (author && !isHex(author)) {
      throw new Error(`Author must be hex: ${author}`);
    }
    this.kind = kind;

    // convert legacy marker string to scope
    if (scope) {
      if (typeof scope === "string") {
        switch (scope.toLowerCase()) {
          case "root": {
            this.scope = LinkScope.Root;
            break;
          }
          case "reply": {
            this.scope = LinkScope.Reply;
            break;
          }
          case "mention": {
            this.scope = LinkScope.Mention;
            break;
          }
          default: {
            throw new Error(`Invalid marker: ${scope}`);
          }
        }
      } else {
        this.scope = scope;
      }
    }
  }

  /**
   * Encode the link into a [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md) entity
   */
  encode(type?: NostrPrefix): string {
    try {
      // cant encode 'naddr' to 'note'/'nevent' because 'id' is not hex
      const newType = this.type === NostrPrefix.Address ? this.type : (type ?? this.type);
      if (newType === NostrPrefix.Note || newType === NostrPrefix.PrivateKey || newType === NostrPrefix.PublicKey) {
        return hexToBech32(newType, this.id);
      } else if (!isPrefixTlvIdHex(newType)) {
        return encodeTLV(newType, utf8ToBytes(this.id), this.relays, this.kind, this.author);
      } else {
        return encodeTLV(newType, hexToBytes(this.id), this.relays, this.kind, this.author);
      }
    } catch (e) {
      console.error("Invalid data", this, e);
      throw e;
    }
  }

  /**
   * Gets a string identifier for this link
   *
   * Works similarly to EventExt.keyOf
   */
  get tagKey() {
    if (this.type === NostrPrefix.Address) {
      return `${this.kind}:${this.author}:${this.id}`;
    }
    return this.id;
  }

  /**
   * Create an event tag for this link (Uses Nip10)
   */
  toEventTag() {
    return Nip10.linkToTag(this);
  }

  matchesEvent(ev: NostrEvent) {
    if (this.type === NostrPrefix.Address) {
      const dTag = findTag(ev, "d");
      if (dTag && dTag === this.id && unwrap(this.author) === ev.pubkey && unwrap(this.kind) === ev.kind) {
        return true;
      }
    } else if (this.type === NostrPrefix.Event || this.type === NostrPrefix.Note) {
      const ifSetCheck = <T>(a: T | undefined, b: T) => {
        return !a || a === b;
      };
      return (
        (EventExt.isReplaceable(ev.kind) || ifSetCheck(this.id, ev.id)) &&
        ifSetCheck(this.author, ev.pubkey) &&
        ifSetCheck(this.kind, ev.kind)
      );
    }

    return false;
  }

  /**
   * Is the supplied event a reply to this link
   */
  isReplyToThis(ev: NostrEvent) {
    if (this.matchesEvent(ev)) return false; // cant match self

    const thread = EventExt.extractThread(ev);
    if (!thread) return false; // non-thread events are not replies

    return (thread.root?.equals(this) || thread.replyTo?.equals(this)) ?? false;
  }

  /**
   * Does the supplied event contain a tag matching this link
   */
  referencesThis(ev: NostrEvent) {
    for (const t of ev.tags) {
      if (t[0] === "e" && t[1] === this.id && (this.type === NostrPrefix.Event || this.type === NostrPrefix.Note)) {
        return true;
      }
      if (t[0] === "a" && this.type === NostrPrefix.Address) {
        const [kind, author, dTag] = t[1].split(":");
        if (Number(kind) === this.kind && author === this.author && dTag === this.id) {
          return true;
        }
      }
      if (
        t[0] === "p" &&
        (this.type === NostrPrefix.Profile || this.type === NostrPrefix.PublicKey) &&
        this.id === t[1]
      ) {
        return true;
      }
    }
    return false;
  }

  equals(other: NostrLink) {
    return other.tagKey === this.tagKey;
  }

  static fromTag(tag: Array<string>, author?: string, kind?: number) {
    const relays = tag.length > 2 ? [tag[2]] : undefined;
    switch (tag[0]) {
      case "E": {
        return new NostrLink(NostrPrefix.Event, tag[1], kind, author ?? tag[3], relays, LinkScope.Root);
      }
      case "e": {
        const markerIsPubkey = isHex(tag[3]);
        return new NostrLink(
          NostrPrefix.Event,
          tag[1],
          kind,
          author ?? (markerIsPubkey ? tag[3] : tag[4]),
          relays,
          markerIsPubkey ? undefined : tag[3],
        );
      }
      case "P":
      case "p": {
        // ["p", <id>, <relay>]
        const scope = tag[0] === "P" ? LinkScope.Root : undefined;
        return new NostrLink(NostrPrefix.Profile, tag[1], kind, author, relays, scope);
      }
      case "A":
      case "a": {
        const [kind, author, dTag] = tag[1].split(":");
        if (!isHex(author)) {
          throw new Error(`Invalid author in a tag: ${tag[1]}`);
        }
        const scope = tag[3] ?? (tag[0] === "A" ? LinkScope.Root : undefined);
        return new NostrLink(NostrPrefix.Address, dTag, Number(kind), author, relays, scope);
      }
    }
    throw new Error("Unknown tag!");
  }

  static tryFromTag(tag: Array<string>, author?: string, kind?: number) {
    try {
      return NostrLink.fromTag(tag, author, kind);
    } catch (e) {
      // ignored
    }
  }

  static fromTags(tags: ReadonlyArray<Array<string>>) {
    return removeUndefined(
      tags.map(a => {
        try {
          return NostrLink.fromTag(a);
        } catch {
          // ignored, cant be mapped
        }
      }),
    );
  }

  /**
   * Parse all tags even if they are unknown
   */
  static fromAllTags(tags: ReadonlyArray<Array<string>>): Array<ToNostrEventTag> {
    return removeUndefined(
      tags.map(a => {
        try {
          return NostrLink.fromTag(a);
        } catch {
          return new UnknownTag(a);
        }
      }),
    );
  }

  /**
   * Return all tags which are replies
   */
  static replyTags(tags: ReadonlyArray<Array<string>>): Array<NostrLink> {
    return tags.filter(t => ["e", "a"].includes(t[0])).map(t => NostrLink.fromTag(t)!);
  }

  /**
   * Create an event link from an existing nostr event
   */
  static fromEvent(ev: TaggedNostrEvent | NostrEvent) {
    let relays = "relays" in ev ? ev.relays : undefined;
    // extract the relay tags from the event to use in linking to this event
    const eventRelays = removeUndefined(
      ev.tags
        .filter(a => a[0] === "relays" || a[0] === "relay" || (a[0] === "r" && ev.kind == EventKind.Relays))
        .flatMap(a => a.slice(1).map(b => sanitizeRelayUrl(b))),
    );
    relays = appendDedupe(relays, eventRelays);

    if (ev.kind >= 30_000 && ev.kind < 40_000) {
      const dTag = unwrap(findTag(ev, "d"));
      return new NostrLink(NostrPrefix.Address, dTag, ev.kind, ev.pubkey, relays);
    }
    // TODO: why no kind 10k ???
    return new NostrLink(NostrPrefix.Event, ev.id, ev.kind, ev.pubkey, relays);
  }

  static profile(pk: string, relays?: Array<string>) {
    return new NostrLink(NostrPrefix.Profile, pk, undefined, undefined, relays);
  }

  static publicKey(pk: string, relays?: Array<string>) {
    return new NostrLink(NostrPrefix.PublicKey, pk, undefined, undefined, relays);
  }
}

export function tryParseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink | undefined {
  try {
    return parseNostrLink(link, prefixHint);
  } catch {
    return undefined;
  }
}

export function isNostrLink(link: string) {
  const entity = link.startsWith("web+nostr:") || link.startsWith("nostr:") ? link.split(":")[1] : link;
  const ent = entity.match(Bech32Regex)?.[0];
  return ent !== undefined;
}

export function trimNostrLink(link: string) {
  let entity = link.startsWith("web+nostr:") || link.startsWith("nostr:") ? link.split(":")[1] : link;

  // trim any non-bech32 chars
  entity = entity.match(Bech32Regex)?.[0] ?? entity;
  return entity;
}

export function parseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink {
  const entity = trimNostrLink(link);

  const isPrefix = (prefix: NostrPrefix) => {
    return entity.startsWith(prefix);
  };

  if (isPrefix(NostrPrefix.PublicKey)) {
    const id = bech32ToHex(entity);
    if (id.length !== 64) throw new Error("Invalid nostr link, must contain 32 byte id");
    return new NostrLink(NostrPrefix.PublicKey, id);
  } else if (isPrefix(NostrPrefix.Note)) {
    const id = bech32ToHex(entity);
    if (id.length !== 64) throw new Error("Invalid nostr link, must contain 32 byte id");
    return new NostrLink(NostrPrefix.Note, id);
  } else if (isPrefix(NostrPrefix.Profile) || isPrefix(NostrPrefix.Event) || isPrefix(NostrPrefix.Address)) {
    const decoded = decodeTLV(entity);

    const id = decoded.find(a => a.type === TLVEntryType.Special)?.value as string;
    const relays = decoded.filter(a => a.type === TLVEntryType.Relay).map(a => a.value as string);
    const author = decoded.find(a => a.type === TLVEntryType.Author)?.value as string;
    const kind = decoded.find(a => a.type === TLVEntryType.Kind)?.value as number;

    if (isPrefix(NostrPrefix.Profile)) {
      if (id.length !== 64) throw new Error("Invalid nostr link, must contain 32 byte id");
      return new NostrLink(NostrPrefix.Profile, id, kind, author, relays);
    } else if (isPrefix(NostrPrefix.Event)) {
      if (id.length !== 64) throw new Error("Invalid nostr link, must contain 32 byte id");
      return new NostrLink(NostrPrefix.Event, id, kind, author, relays);
    } else if (isPrefix(NostrPrefix.Address)) {
      return new NostrLink(NostrPrefix.Address, id, kind, author, relays);
    }
  } else if (prefixHint) {
    return new NostrLink(prefixHint, link);
  }
  throw new Error("Invalid nostr link");
}
