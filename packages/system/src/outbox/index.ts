import { EventKind, FullRelaySettings, NostrEvent, SystemInterface, UsersRelays } from "..";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";

export const DefaultPickNRelays = 2;

export interface AuthorsRelaysCache {
  getFromCache(pubkey?: string): UsersRelays | undefined;
  update(obj: UsersRelays): Promise<"new" | "updated" | "refresh" | "no_change">;
  buffer(keys: Array<string>): Promise<Array<string>>;
  bulkSet(objs: Array<UsersRelays>): Promise<void>;
}

export interface PickedRelays {
  key: string;
  relays: Array<string>;
}

export type EventFetcher = {
  Fetch: SystemInterface["Fetch"];
};

export function parseRelayTag(tag: Array<string>) {
  if (tag[0] !== "r") return;
  const url = sanitizeRelayUrl(tag[1]);
  if (url) {
    return {
      url,
      settings: {
        read: tag[2] === "read" || tag[2] === undefined,
        write: tag[2] === "write" || tag[2] === undefined,
      },
    } as FullRelaySettings;
  }
}

export function parseRelayTags(tag: Array<Array<string>>) {
  return removeUndefined(tag.map(parseRelayTag));
}

export function parseRelaysFromKind(ev: NostrEvent) {
  if (ev.kind === EventKind.ContactList) {
    const relaysInContent =
      ev.content.length > 0 ? (JSON.parse(ev.content) as Record<string, { read: boolean; write: boolean }>) : undefined;
    if (relaysInContent) {
      return removeUndefined(
        Object.entries(relaysInContent).map(([k, v]) => {
          const url = sanitizeRelayUrl(k);
          if (url) {
            return {
              url,
              settings: {
                read: v.read,
                write: v.write,
              },
            } as FullRelaySettings;
          }
        }),
      );
    }
  } else if (ev.kind === EventKind.Relays) {
    return parseRelayTags(ev.tags);
  }
}

/**
 * Convert relay settings into NIP-65 relay tag
 */
export function settingsToRelayTag(rx: FullRelaySettings) {
  const rTag = ["r", rx.url];
  if (rx.settings.read && !rx.settings.write) {
    rTag.push("read");
  }
  if (rx.settings.write && !rx.settings.read) {
    rTag.push("write");
  }
  if (rx.settings.read || rx.settings.write) {
    return rTag;
  }
}

export * from "./outbox-model";
export * from "./relay-loader";
