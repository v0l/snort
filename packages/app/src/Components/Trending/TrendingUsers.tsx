import { HexKey } from "@snort/system";
import { ReactNode } from "react";

import PageSpinner from "@/Components/PageSpinner";
import FollowListBase, { FollowListBaseProps } from "@/Components/User/FollowListBase";
import NostrBandApi from "@/External/NostrBand";
import useCachedFetch from "@/Hooks/useCachedFetch";

import { ErrorOrOffline } from "../ErrorOrOffline";

export default function TrendingUsers({
  title,
  count = Infinity,
  followAll = true,
  actions,
  profileActions,
}: {
  title?: ReactNode;
  count?: number;
  followAll?: boolean;
  actions?: FollowListBaseProps["actions"];
  profileActions?: FollowListBaseProps["profileActions"];
}) {
  const api = new NostrBandApi();
  const trendingProfilesUrl = api.trendingProfilesUrl();
  const storageKey = `nostr-band-${trendingProfilesUrl}`;

  const {
    data: trendingUsersData,
    isLoading,
    error,
  } = useCachedFetch(trendingProfilesUrl, storageKey, data => data.profiles.map(a => a.pubkey));

  if (error && !trendingUsersData) {
    return <ErrorOrOffline error={error} onRetry={() => {}} className="p" />;
  }

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <FollowListBase
      pubkeys={trendingUsersData.slice(0, count) as HexKey[]}
      showAbout={true}
      title={title}
      showFollowAll={followAll}
      actions={actions}
      profileActions={profileActions}
    />
  );
}
