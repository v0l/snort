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

export interface ToNostrEventTag {
  toEventTag(): Array<string> | undefined;
}

export class NostrHashtagLink implements ToNostrEventTag {
  constructor(readonly tag: string) {}

  toEventTag(): string[] | undefined {
    return ["t", this.tag];
  }
}

export class NostrLink implements ToNostrEventTag {
  constructor(
    readonly type: NostrPrefix,
    readonly id: string,
    readonly kind?: number,
    readonly author?: string,
    readonly relays?: Array<string>,
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

  toEventTag() {
    const relayEntry = this.relays ? [this.relays[0]] : [];
    if (this.type === NostrPrefix.PublicKey || this.type === NostrPrefix.Profile) {
      return ["p", this.id, ...relayEntry];
    } else if (this.type === NostrPrefix.Note || this.type === NostrPrefix.Event) {
      return ["e", this.id, ...relayEntry];
    } else if (this.type === NostrPrefix.Address) {
      return ["a", `${this.kind}:${this.author}:${this.id}`, ...relayEntry];
    }
  }

  matchesEvent(ev: NostrEvent) {
    if (this.type === NostrPrefix.Address) {
      const dTag = findTag(ev, "d");
      if (dTag && dTag === this.id && unwrap(this.author) === ev.pubkey && unwrap(this.kind) === ev.kind) {
        return true;
      }
    } else if (this.type === NostrPrefix.Event || this.type === NostrPrefix.Note) {
      return this.id === ev.id;
    }

    return false;
  }

  /**
   * Is the supplied event a reply to this link
   */
  isReplyToThis(ev: NostrEvent) {
    const NonNip10Kinds = [EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt];
    if (NonNip10Kinds.includes(ev.kind)) {
      const lastRef = ev.tags.findLast(a => a[0] === "e" || a[1] === "a");
      if (!lastRef) return false;

      if (
        lastRef[0] === "e" &&
        lastRef[1] === this.id &&
        (this.type === NostrPrefix.Event || this.type === NostrPrefix.Note)
      ) {
        return true;
      }
      if (lastRef[0] === "a" && this.type === NostrPrefix.Address) {
        const [kind, author, dTag] = lastRef[1].split(":");
        if (Number(kind) === this.kind && author === this.author && dTag === this.id) {
          return true;
        }
      }
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
    if (other.type === this.type && this.type === NostrPrefix.Address) {
    }
  }

  static fromThreadTag(tag: Tag) {
    const relay = tag.relay ? [tag.relay] : undefined;

    switch (tag.key) {
      case "e": {
        return new NostrLink(NostrPrefix.Event, unwrap(tag.value), undefined, undefined, relay);
      }
      case "p": {
        return new NostrLink(NostrPrefix.Profile, unwrap(tag.value), undefined, undefined, relay);
      }
      case "a": {
        const [kind, author, dTag] = unwrap(tag.value).split(":");
        return new NostrLink(NostrPrefix.Address, dTag, Number(kind), author, relay);
      }
    }
    throw new Error(`Unknown tag kind ${tag.key}`);
  }

  static fromTag(tag: Array<string>) {
    const relays = tag.length > 2 ? [tag[2]] : undefined;
    switch (tag[0]) {
      case "e": {
        return new NostrLink(NostrPrefix.Event, tag[1], undefined, undefined, relays);
      }
      case "p": {
        return new NostrLink(NostrPrefix.Profile, tag[1], undefined, undefined, relays);
      }
      case "a": {
        const [kind, author, dTag] = tag[1].split(":");
        return new NostrLink(NostrPrefix.Address, dTag, Number(kind), author, relays);
      }
    }
    throw new Error(`Unknown tag kind ${tag[0]}`);
  }

  static fromTags(tags: Array<Array<string>>) {
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

  static fromEvent(ev: TaggedNostrEvent | NostrEvent) {
    const relays = "relays" in ev ? ev.relays : undefined;

    if (ev.kind >= 30_000 && ev.kind < 40_000) {
      const dTag = unwrap(findTag(ev, "d"));
      return new NostrLink(NostrPrefix.Address, dTag, ev.kind, ev.pubkey, relays);
    }
    return new NostrLink(NostrPrefix.Event, ev.id, ev.kind, ev.pubkey, relays);
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

export function parseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink {
  let entity = link.startsWith("web+nostr:") || link.startsWith("nostr:") ? link.split(":")[1] : link;

  // trim any non-bech32 chars
  entity = entity.match(/(n(?:pub|profile|event|ote|addr|req)1[acdefghjklmnpqrstuvwxyz023456789]+)/)?.[0] ?? entity;

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
