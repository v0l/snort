import { bech32ToHex, hexToBech32 } from "@snort/shared";
import { NostrPrefix, decodeTLV, TLVEntryType, encodeTLV } from ".";

export interface NostrLink {
  type: NostrPrefix;
  id: string;
  kind?: number;
  author?: string;
  relays?: Array<string>;
  encode(): string;
}

export function createNostrLink(prefix: NostrPrefix, id: string, relays?: string[], kind?: number, author?: string) {
  return {
    type: prefix,
    id,
    relays,
    kind,
    author,
    encode: () => {
      if (prefix === NostrPrefix.Note || prefix === NostrPrefix.PublicKey) {
        return hexToBech32(prefix, id);
      }
      if (prefix === NostrPrefix.Address || prefix === NostrPrefix.Event || prefix === NostrPrefix.Profile) {
        return encodeTLV(prefix, id, relays, kind, author);
      }
      return "";
    },
  } as NostrLink;
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
    return {
      type: NostrPrefix.PublicKey,
      id: id,
      encode: () => hexToBech32(NostrPrefix.PublicKey, id),
    };
  } else if (isPrefix(NostrPrefix.Note)) {
    const id = bech32ToHex(entity);
    if (id.length !== 64) throw new Error("Invalid nostr link, must contain 32 byte id");
    return {
      type: NostrPrefix.Note,
      id: id,
      encode: () => hexToBech32(NostrPrefix.Note, id),
    };
  } else if (isPrefix(NostrPrefix.Profile) || isPrefix(NostrPrefix.Event) || isPrefix(NostrPrefix.Address)) {
    const decoded = decodeTLV(entity);

    const id = decoded.find(a => a.type === TLVEntryType.Special)?.value as string;
    const relays = decoded.filter(a => a.type === TLVEntryType.Relay).map(a => a.value as string);
    const author = decoded.find(a => a.type === TLVEntryType.Author)?.value as string;
    const kind = decoded.find(a => a.type === TLVEntryType.Kind)?.value as number;

    const encode = () => {
      return entity; // return original
    };
    if (isPrefix(NostrPrefix.Profile)) {
      if (id.length !== 64) throw new Error("Invalid nostr link, must contain 32 byte id");
      return {
        type: NostrPrefix.Profile,
        id,
        relays,
        kind,
        author,
        encode,
      };
    } else if (isPrefix(NostrPrefix.Event)) {
      if (id.length !== 64) throw new Error("Invalid nostr link, must contain 32 byte id");
      return {
        type: NostrPrefix.Event,
        id,
        relays,
        kind,
        author,
        encode,
      };
    } else if (isPrefix(NostrPrefix.Address)) {
      return {
        type: NostrPrefix.Address,
        id,
        relays,
        kind,
        author,
        encode,
      };
    }
  } else if (prefixHint) {
    return {
      type: prefixHint,
      id: link,
      encode: () => hexToBech32(prefixHint, link),
    };
  }
  throw new Error("Invalid nostr link");
}
