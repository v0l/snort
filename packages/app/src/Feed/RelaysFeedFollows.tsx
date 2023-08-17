import { useMemo } from "react";
import {
  HexKey,
  FullRelaySettings,
  TaggedNostrEvent,
  RelaySettings,
  EventKind,
  NoteCollection,
  RequestBuilder,
} from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import debug from "debug";

import { sanitizeRelayUrl } from "SnortUtils";
import { UserRelays } from "Cache";
import { System } from "index";

interface RelayList {
  pubkey: string;
  created_at: number;
  relays: FullRelaySettings[];
}

export default function useRelaysFeedFollows(pubkeys: HexKey[]): Array<RelayList> {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`relays:follows`);
    const since = UserRelays.newest();
    debug("LoginFeed")("Loading relay lists since %s", new Date(since * 1000).toISOString());
    b.withFilter().authors(pubkeys).kinds([EventKind.Relays, EventKind.ContactList]).since(since);
    return b;
  }, [pubkeys]);

  function mapFromRelays(notes: Array<TaggedNostrEvent>): Array<RelayList> {
    return notes.map(ev => {
      return {
        pubkey: ev.pubkey,
        created_at: ev.created_at,
        relays: ev.tags
          .map(a => {
            return {
              url: sanitizeRelayUrl(a[1]),
              settings: {
                read: a[2] === "read" || a[2] === undefined,
                write: a[2] === "write" || a[2] === undefined,
              },
            } as FullRelaySettings;
          })
          .filter(a => a.url !== undefined),
      };
    });
  }

  // instead of discarding the follow list we should also use it for follow graph
  function mapFromContactList(notes: Array<TaggedNostrEvent>): Array<RelayList> {
    return notes.map(ev => {
      if (ev.content !== "" && ev.content !== "{}" && ev.content.startsWith("{") && ev.content.endsWith("}")) {
        try {
          const relays: Record<string, RelaySettings> = JSON.parse(ev.content);
          return {
            pubkey: ev.pubkey,
            created_at: ev.created_at,
            relays: Object.entries(relays)
              .map(([k, v]) => {
                return {
                  url: sanitizeRelayUrl(k),
                  settings: v,
                } as FullRelaySettings;
              })
              .filter(a => a.url !== undefined),
          };
        } catch {
          // ignored
        }
      }
      return {
        pubkey: ev.pubkey,
        created_at: 0,
        relays: [],
      };
    });
  }

  const relays = useRequestBuilder<NoteCollection>(System, NoteCollection, sub);
  const notesRelays = relays.data?.filter(a => a.kind === EventKind.Relays) ?? [];
  const notesContactLists = relays.data?.filter(a => a.kind === EventKind.ContactList) ?? [];
  return useMemo(() => {
    return [...mapFromContactList(notesContactLists), ...mapFromRelays(notesRelays)];
  }, [relays]);
}
