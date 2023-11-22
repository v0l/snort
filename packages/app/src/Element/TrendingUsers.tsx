import { ReactNode, useEffect, useState } from "react";
import { HexKey } from "@snort/system";

import FollowListBase from "@/Element/User/FollowListBase";
import PageSpinner from "@/Element/PageSpinner";
import NostrBandApi from "@/External/NostrBand";
import { ErrorOrOffline } from "./ErrorOrOffline";

export default function TrendingUsers({ title, count = 5 }: { title?: ReactNode; count?: number }) {
  const [userList, setUserList] = useState<HexKey[]>();
  const [error, setError] = useState<Error>();

  async function loadTrendingUsers() {
    const api = new NostrBandApi();
    const users = await api.trendingProfiles();
    const keys = users.profiles.map(a => a.pubkey).slice(0, count); // Limit the user list to the count
    setUserList(keys);
  }

  useEffect(() => {
    loadTrendingUsers().catch(e => {
      if (e instanceof Error) {
        setError(e);
      }
    });
  }, []);

  if (error) return <ErrorOrOffline error={error} onRetry={loadTrendingUsers} className="p" />;
  if (!userList) return <PageSpinner />;

  return <FollowListBase pubkeys={userList} showAbout={true} title={title} />;
}
