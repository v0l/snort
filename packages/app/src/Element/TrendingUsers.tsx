import { useEffect, useState } from "react";
import { HexKey } from "@snort/nostr";
import { FormattedMessage } from "react-intl";

import FollowListBase from "Element/FollowListBase";
import PageSpinner from "Element/PageSpinner";

interface TrendingUser {
  pubkey: HexKey;
}

interface TrendingUserResponse {
  profiles: Array<TrendingUser>;
}

async function fetchTrendingUsers() {
  try {
    const res = await fetch(`https://api.nostr.band/v0/trending/profiles`);
    if (res.ok) {
      const data = (await res.json()) as TrendingUserResponse;
      return data.profiles.map(a => a.pubkey);
    }
  } catch (e) {
    console.warn(`Failed to load link preview`);
  }
}

const TrendingUsers = () => {
  const [userList, setUserList] = useState<HexKey[]>();

  useEffect(() => {
    (async () => {
      const data = await fetchTrendingUsers();
      if (data) {
        setUserList(data);
      }
    })();
  }, []);

  if (!userList) return <PageSpinner />;

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Trending Users" />
      </h3>
      <FollowListBase pubkeys={userList} />
    </>
  );
};

export default TrendingUsers;
