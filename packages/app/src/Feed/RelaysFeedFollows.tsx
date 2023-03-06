import { useMemo } from "react";
import { HexKey, FullRelaySettings, TaggedRawEvent, RelaySettings } from "@snort/nostr";
import { EventKind, Subscriptions } from "@snort/nostr";
import useSubscription from "./Subscription";
import { getLatestByPubkey, sanitizeRelayUrl } from "../Util";

type UserRelayMap = Record<HexKey, Array<FullRelaySettings>>;

export default function useRelaysFeedFollows(pubkeys: HexKey[]): UserRelayMap {
  const sub = useMemo(() => {
    const x = new Subscriptions();
    x.Id = `relays:follows`;
    x.Kinds = new Set([EventKind.Relays, EventKind.ContactList]);
    x.Authors = new Set(pubkeys);
    return x;
  }, [pubkeys]);

  function mapFromRelays(notes: Map<HexKey, TaggedRawEvent>): UserRelayMap {
    return Object.fromEntries(
      [...notes.values()].map(ev => {
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

  function mapFromContactList(notes: Map<HexKey, TaggedRawEvent>): UserRelayMap {
    return Object.fromEntries(
      [...notes.values()].map(ev => {
        if (ev.content !== "" && ev.content !== "{}") {
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
        } else {
          return [ev.pubkey, []];
        }
      })
    );
  }

  const relays = useSubscription(sub, { leaveOpen: true, cache: true });
  const notesRelays = getLatestByPubkey(relays.store.notes.filter(a => a.kind === EventKind.Relays));
  const notesContactLists = getLatestByPubkey(relays.store.notes.filter(a => a.kind === EventKind.ContactList));
  return useMemo(() => {
    return {
      ...mapFromContactList(notesContactLists),
      ...mapFromRelays(notesRelays),
    } as UserRelayMap;
  }, [relays.store]);
}
