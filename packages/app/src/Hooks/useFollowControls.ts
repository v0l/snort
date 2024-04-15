import { DiffSyncTags, EventKind, NostrLink, NostrPrefix } from "@snort/system";
import { useMemo } from "react";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

/**
 * Simple hook for adding / removing follows
 */
export default function useFollowsControls() {
  const { publisher, system } = useEventPublisher();
  const { pubkey, contacts, relays } = useLogin(s => ({
    pubkey: s.publicKey,
    contacts: s.contacts,
    readonly: s.readonly,
    relays: s.relays.item,
  }));

  return useMemo(() => {
    const link = new NostrLink(NostrPrefix.Event, "", EventKind.ContactList, pubkey);
    const sync = new DiffSyncTags(link);
    const content = JSON.stringify(relays);
    return {
      isFollowing: (pk: string) => {
        return contacts.some(a => a[0] === "p" && a[1] === pk);
      },
      addFollow: async (pk: Array<string>) => {
        sync.add(pk.map(a => ["p", a]));
        if (publisher) {
          await sync.persist(publisher.signer, system, content);
        }
      },
      removeFollow: async (pk: Array<string>) => {
        sync.remove(pk.map(a => ["p", a]));
        if (publisher) {
          await sync.persist(publisher.signer, system, content);
        }
      },
      setFollows: async (pk: Array<string>) => {
        sync.replace(pk.map(a => ["p", a]));
        if (publisher) {
          await sync.persist(publisher.signer, system, content);
        }
      },
      followList: contacts.filter(a => a[0] === "p").map(a => a[1]),
    };
  }, [contacts, relays, publisher, system]);
}
