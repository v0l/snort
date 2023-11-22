import { useMemo } from "react";
import { HexKey, FullRelaySettings, TaggedNostrEvent, EventKind, NoteCollection, RequestBuilder, parseRelayTags } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import debug from "debug";

import { UserRelays } from "@/Cache";

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
        relays: parseRelayTags(ev.tags),
      };
    });
  }

  const relays = useRequestBuilder(NoteCollection, sub);
  const notesRelays = relays.data?.filter(a => a.kind === EventKind.Relays) ?? [];
  return useMemo(() => {
    return mapFromRelays(notesRelays);
  }, [relays]);
}