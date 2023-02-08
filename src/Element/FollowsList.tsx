import { useMemo } from "react";
import { useIntl } from "react-intl";

import useFollowsFeed from "Feed/FollowsFeed";
import { HexKey } from "Nostr";
import FollowListBase from "Element/FollowListBase";
import { getFollowers } from "Feed/FollowsFeed";

import messages from "./messages";

export interface FollowsListProps {
  pubkey: HexKey;
}

export default function FollowsList({ pubkey }: FollowsListProps) {
  const feed = useFollowsFeed(pubkey);
  const { formatMessage } = useIntl();

  const pubkeys = useMemo(() => {
    return getFollowers(feed.store, pubkey);
  }, [feed, pubkey]);

  return (
    <FollowListBase
      pubkeys={pubkeys}
      title={formatMessage(messages.FollowingCount, { n: pubkeys?.length })}
    />
  );
}
