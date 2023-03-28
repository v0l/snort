import { useMemo } from "react";
import { HexKey, FullRelaySettings, TaggedRawEvent, RelaySettings, EventKind } from "@snort/nostr";

import { sanitizeRelayUrl } from "Util";
import { PubkeyReplaceableNoteStore, RequestBuilder } from "System";
import useRequestBuilder from "Hooks/useRequestBuilder";

type UserRelayMap = Record<HexKey, Array<FullRelaySettings>>;

export default function useRelaysFeedFollows(pubkeys: HexKey[]): UserRelayMap {
  const sub = useMemo(() => {
    const b = new RequestBuilder(`relays:follows`);
    b.withFilter().authors(pubkeys).kinds([EventKind.Relays, EventKind.ContactList]);
    return b;
  }, [pubkeys]);

  function mapFromRelays(notes: Array<TaggedRawEvent>): UserRelayMap {
    return Object.fromEntries(
      notes.map(ev => {
        return [
          ev.pubkey,
          ev.tags
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
        ];
      })
    );
  }

  function mapFromContactList(notes: Array<TaggedRawEvent>): UserRelayMap {
    return Object.fromEntries(
      notes.map(ev => {
        if (ev.content !== "" && ev.content !== "{}" && ev.content.startsWith("{") && ev.content.endsWith("}")) {
          try {
            const relays: Record<string, RelaySettings> = JSON.parse(ev.content);
            return [
              ev.pubkey,
              Object.entries(relays)
                .map(([k, v]) => {
                  return {
                    url: sanitizeRelayUrl(k),
                    settings: v,
                  } as FullRelaySettings;
                })
                .filter(a => a.url !== undefined),
            ];
          } catch {
            // ignored
          }
        }
        return [ev.pubkey, []];
      })
    );
  }

  const relays = useRequestBuilder<PubkeyReplaceableNoteStore>(PubkeyReplaceableNoteStore, sub);
  const notesRelays = relays.data?.filter(a => a.kind === EventKind.Relays) ?? [];
  const notesContactLists = relays.data?.filter(a => a.kind === EventKind.ContactList) ?? [];
  return useMemo(() => {
    return {
      ...mapFromContactList(notesContactLists),
      ...mapFromRelays(notesRelays),
    } as UserRelayMap;
  }, [relays]);
}
