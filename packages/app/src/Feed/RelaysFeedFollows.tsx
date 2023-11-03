import { useMemo } from "react";
import {
  HexKey,
  FullRelaySettings,
  TaggedNostrEvent,
  EventKind,
  NoteCollection,
  RequestBuilder,
} from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import debug from "debug";

import { sanitizeRelayUrl } from "SnortUtils";
import { UserRelays } from "Cache";

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
    b.withFilter().authors(pubkeys).kinds([EventKind.Relays]).since(since);
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

  const relays = useRequestBuilder(NoteCollection, sub);
  const notesRelays = relays.data?.filter(a => a.kind === EventKind.Relays) ?? [];
  return useMemo(() => {
    return mapFromRelays(notesRelays);
  }, [relays]);
}
