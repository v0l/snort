import { useMemo } from "react";
import { useIntl } from "react-intl";

import useFollowersFeed from "Feed/FollowersFeed";
import { HexKey } from "Nostr";
import EventKind from "Nostr/EventKind";
import FollowListBase from "Element/FollowListBase";

import messages from "./messages";

export interface FollowersListProps {
  pubkey: HexKey;
}

export default function FollowersList({ pubkey }: FollowersListProps) {
  const { formatMessage } = useIntl();
  const feed = useFollowersFeed(pubkey);

  const pubkeys = useMemo(() => {
    const contactLists = feed?.store.notes.filter(
      a => a.kind === EventKind.ContactList && a.tags.some(b => b[0] === "p" && b[1] === pubkey)
    );
    return [...new Set(contactLists?.map(a => a.pubkey))];
  }, [feed, pubkey]);

  return <FollowListBase pubkeys={pubkeys} title={formatMessage(messages.FollowerCount, { n: pubkeys?.length })} />;
}
