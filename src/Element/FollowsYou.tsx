import "./FollowsYou.css";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useIntl } from "react-intl";

import { HexKey } from "Nostr";
import { RootState } from "State/Store";
import useFollowsFeed from "Feed/FollowsFeed";
import { getFollowers } from "Feed/FollowsFeed";

import messages from "./messages";

export interface FollowsYouProps {
  pubkey: HexKey;
}

export default function FollowsYou({ pubkey }: FollowsYouProps) {
  const { formatMessage } = useIntl();
  const feed = useFollowsFeed(pubkey);
  const loginPubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);

  const pubkeys = useMemo(() => {
    return getFollowers(feed.store, pubkey);
  }, [feed, pubkey]);

  const followsMe = loginPubKey ? pubkeys.includes(loginPubKey) : false;

  return followsMe ? <span className="follows-you">{formatMessage(messages.FollowsYou)}</span> : null;
}
