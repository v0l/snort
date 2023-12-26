import { ReactNode } from "react";
import { HexKey } from "@snort/system";
import FollowListBase from "@/Element/User/FollowListBase";
import PageSpinner from "@/Element/PageSpinner";
import NostrBandApi from "@/External/NostrBand";
import { ErrorOrOffline } from "../ErrorOrOffline";
import useCachedFetch from "@/Hooks/useCachedFetch";

export default function TrendingUsers({ title, count = Infinity }: { title?: ReactNode; count?: number }) {
  const api = new NostrBandApi();
  const trendingProfilesUrl = api.trendingProfilesUrl();
  const storageKey = `nostr-band-${trendingProfilesUrl}`;

  const {
    data: trendingUsersData,
    isLoading,
    error,
  } = useCachedFetch(trendingProfilesUrl, storageKey, data => data.profiles.map(a => a.pubkey));

  if (error) {
    return <ErrorOrOffline error={error} onRetry={() => {}} className="p" />;
  }

  if (isLoading || !trendingUsersData) {
    return <PageSpinner />;
  }

  return <FollowListBase pubkeys={trendingUsersData.slice(0, count) as HexKey[]} showAbout={true} title={title} />;
}
