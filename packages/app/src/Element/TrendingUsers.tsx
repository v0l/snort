import { useEffect, useState } from "react";
import { HexKey } from "@snort/system";

import FollowListBase from "Element/FollowListBase";
import PageSpinner from "Element/PageSpinner";
import NostrBandApi from "External/NostrBand";

export default function TrendingUsers() {
  const [userList, setUserList] = useState<HexKey[]>();

  async function loadTrendingUsers() {
    const api = new NostrBandApi();
    const users = await api.trendingProfiles();
    const keys = users.profiles.map(a => a.pubkey);
    setUserList(keys);
  }

  useEffect(() => {
    loadTrendingUsers().catch(console.error);
  }, []);

  if (!userList) return <PageSpinner />;

  return (
    <div className="p">
      <FollowListBase pubkeys={userList} showAbout={true} />
    </div>
  );
}
