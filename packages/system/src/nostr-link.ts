import { bech32ToHex, hexToBech32, isHex, removeUndefined, unwrap } from "@snort/shared";
import {
  decodeTLV,
  encodeTLV,
  EventExt,
  EventKind,
  NostrEvent,
  NostrPrefix,
  Tag,
  TaggedNostrEvent,
  TLVEntryType,
} from ".";
import { findTag } from "./utils";

/**
 * An object which can be stored in a nostr event as a tag
 */
export interface ToNostrEventTag {
  toEventTag(): Array<string> | undefined;
  equals(other: ToNostrEventTag): boolean;
}

export class NostrHashtagLink implements ToNostrEventTag {
  constructor(readonly tag: string) { }

  equals(other: ToNostrEventTag): boolean {
    const otherTag = other.toEventTag();
    return otherTag?.at(0) === "t" && otherTag?.at(1) === this.tag;
  }

  toEventTag() {
    return ["t", this.tag];
  }
}

export class UnknownTag implements ToNostrEventTag {
  constructor(readonly value: Array<string>) { }

  equals(other: ToNostrEventTag): boolean {
    const otherTag = other.toEventTag();
    return otherTag?.at(0) === this.value.at(0) &&
      otherTag?.at(1) === this.value.at(1)
  }

  toEventTag(): string[] | undefined {
    return this.value;
  }
}

export class NostrLink implements ToNostrEventTag {
  constructor(
    readonly type: NostrPrefix,
    readonly id: string,
    readonly kind?: number,
    readonly author?: string,
    readonly relays?: Array<string>,
    readonly marker?: string,
  ) {
    if (type !== NostrPrefix.Address && !isHex(id)) {
      throw new Error("ID must be hex");
    }
  }

  encode(type?: NostrPrefix): string {
    try {
      // cant encode 'naddr' to 'note'/'nevent' because 'id' is not hex
      let newType = this.type === NostrPrefix.Address ? this.type : type ?? this.type;
      if (newType === NostrPrefix.Note || newType === NostrPrefix.PrivateKey || newType === NostrPrefix.PublicKey) {
        return hexToBech32(newType, this.id);
      } else {
        return encodeTLV(newType, this.id, this.relays, this.kind, this.author);
      }
    } catch (e) {
      console.error("Invalid data", this, e);
      throw e;
    }
  }

  get tagKey() {
    if (this.type === NostrPrefix.Address) {
      return `${this.kind}:${this.author}:${this.id}`;
    }
    return this.id;
  }

  /**
   * Create an event tag for this link
   */
  toEventTag(marker?: string) {
    const suffix: Array<string> = [];
    if (this.relays && this.relays.length > 0) {
      suffix.push(this.relays[0]);
    }
    if (marker) {
      if (suffix[0] === undefined) {
        suffix.push(""); // empty relay hint
      }
      suffix.push(marker);
    }

    if (this.type === NostrPrefix.PublicKey || this.type === NostrPrefix.Profile) {
      return ["p", this.id, ...suffix];
    } else if (this.type === NostrPrefix.Note || this.type === NostrPrefix.Event) {
      if (this.author) {
        if (suffix[0] === undefined) {
          suffix.push(""); // empty relay hint
        }
        if (suffix[1] === undefined) {
          suffix.push(""); // empty marker
        }
        suffix.push(this.author);
      }
      return ["e", this.id, ...suffix];
    } else if (this.type === NostrPrefix.Address) {
      return ["a", `${this.kind}:${this.author}:${this.id}`, ...suffix];
    }
  }

  matchesEvent(ev: NostrEvent) {
    if (this.type === NostrPrefix.Address) {
      const dTag = findTag(ev, "d");
      if (dTag && dTag === this.id && unwrap(this.author) === ev.pubkey && unwrap(this.kind) === ev.kind) {
        return true;
      }
    } else if (this.type === NostrPrefix.Event || this.type === NostrPrefix.Note) {
      const ifSetCheck = <T>(a: T | undefined, b: T) => {
        return !Boolean(a) || a === b;
      };
      return ifSetCheck(this.id, ev.id) && ifSetCheck(this.author, ev.pubkey) && ifSetCheck(this.kind, ev.kind);
    }

    return false;
  }

  /**
   * Is the supplied event a reply to this link
   */
  isReplyToThis(ev: NostrEvent) {
    const NonNip10Kinds = [EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt];
    if (NonNip10Kinds.includes(ev.kind)) {
      const links = removeUndefined(ev.tags.filter(a => a[0] === "e" || a[0] === "a").map(a => NostrLink.fromTag(a)));
      if (links.length === 0) return false;
      return links.some(a => a.equals(this));
    } else {
      const thread = EventExt.extractThread(ev);
      if (!thread) return false; // non-thread events are not replies

      if (!thread.root) return false; // must have root marker or positional e/a tag in position 0

      if (
        thread.root.key === "e" &&
        thread.root.value === this.id &&
        (this.type === NostrPrefix.Event || this.type === NostrPrefix.Note)
      ) {
        return true;
      }
      if (thread.root.key === "a" && this.type === NostrPrefix.Address) {
        const [kind, author, dTag] = unwrap(thread.root.value).split(":");
        if (Number(kind) === this.kind && author === this.author && dTag === this.id) {
          return true;
        }
      }
    }
    return false;
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
      case "e": {
        return new NostrLink(NostrPrefix.Event, tag[1], kind, author ?? tag[4], relays, tag[3]);
      }
      case "p": {
        return new NostrLink(NostrPrefix.Profile, tag[1], kind, author, relays);
      }
      case "a": {
        const [kind, author, dTag] = tag[1].split(":");
        return new NostrLink(NostrPrefix.Address, dTag, Number(kind), author, relays, tag[3]);
      }
    }
    throw new Error("Unknown tag!");
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

  static fromEvent(ev: TaggedNostrEvent | NostrEvent) {
    const relays = "relays" in ev ? ev.relays : undefined;

    if (ev.kind >= 30_000 && ev.kind < 40_000) {
      const dTag = unwrap(findTag(ev, "d"));
      return new NostrLink(NostrPrefix.Address, dTag, ev.kind, ev.pubkey, relays);
    }
    return new NostrLink(NostrPrefix.Event, ev.id, ev.kind, ev.pubkey, relays);
  }

  static profile(pk: string, relays?: Array<string>) {
    return new NostrLink(NostrPrefix.Profile, pk, undefined, undefined, relays);
  }

  static publicKey(pk: string, relays?: Array<string>) {
    return new NostrLink(NostrPrefix.PublicKey, pk, undefined, undefined, relays);
  }
}

export function validateNostrLink(link: string): boolean {
  try {
    const parsedLink = parseNostrLink(link);
    if (!parsedLink) {
      return false;
    }
    if (parsedLink.type === NostrPrefix.PublicKey || parsedLink.type === NostrPrefix.Note) {
      return parsedLink.id.length === 64;
    }

    return true;
  } catch {
    return false;
  }
}

export function tryParseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink | undefined {
  try {
    return parseNostrLink(link, prefixHint);
  } catch {
    return undefined;
  }
}

export function trimNostrLink(link: string) {
  let entity = link.startsWith("web+nostr:") || link.startsWith("nostr:") ? link.split(":")[1] : link;

  // trim any non-bech32 chars
  entity = entity.match(/(n(?:pub|profile|event|ote|addr|req)1[acdefghjklmnpqrstuvwxyz023456789]+)/)?.[0] ?? entity;
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
  } else if (
    isPrefix(NostrPrefix.Profile) ||
    isPrefix(NostrPrefix.Event) ||
    isPrefix(NostrPrefix.Address) ||
    isPrefix(NostrPrefix.Req)
  ) {
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
    } else if (isPrefix(NostrPrefix.Req)) {
      return new NostrLink(NostrPrefix.Req, id);
    }
  } else if (prefixHint) {
    return new NostrLink(prefixHint, link);
  }
  throw new Error("Invalid nostr link");
}
