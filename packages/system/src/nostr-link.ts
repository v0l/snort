import { bech32ToHex, hexToBech32, unwrap } from "@snort/shared";
import { NostrPrefix, decodeTLV, TLVEntryType, encodeTLV, NostrEvent, TaggedNostrEvent } from ".";
import { findTag } from "./utils";

export class NostrLink {
  constructor(
    readonly type: NostrPrefix,
    readonly id: string,
    readonly kind?: number,
    readonly author?: string,
    readonly relays?: Array<string>,
  ) {}

  encode(): string {
    if (this.type === NostrPrefix.Note || this.type === NostrPrefix.PrivateKey || this.type === NostrPrefix.PublicKey) {
      return hexToBech32(this.type, this.id);
    } else {
      return encodeTLV(this.type, this.id, this.relays, this.kind, this.author);
    }
  }

  toEventTag() {
    const relayEntry = this.relays ? [this.relays[0]] : [];
    if (this.type === NostrPrefix.PublicKey) {
      return ["p", this.id];
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
  const entity = link.startsWith("web+nostr:") || link.startsWith("nostr:") ? link.split(":")[1] : link;

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
