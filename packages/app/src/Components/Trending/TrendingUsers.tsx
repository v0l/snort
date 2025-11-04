import { ReactNode } from "react";

import PageSpinner from "@/Components/PageSpinner";
import FollowListBase, { FollowListBaseProps } from "@/Components/User/FollowListBase";
import NostrBandApi from "@/External/NostrBand";

import { ErrorOrOffline } from "../ErrorOrOffline";
import { useCached } from "@snort/system-react";
import { Hour } from "@/Utils/Const";

export default function TrendingUsers({
  title,
  count = Infinity,
  followListProps,
}: {
  title?: ReactNode;
  count?: number;
  followListProps?: Omit<FollowListBaseProps, "pubkeys">;
}) {
  const { data, loading, error } = useCached(
    "nostr-band-trending-profiles",
    async () => {
      const api = new NostrBandApi();
      return await api.trendingProfiles();
    },
    Hour * 2,
  );

  if (error && !data) {
    return <ErrorOrOffline error={error} onRetry={() => {}} className="px-3 py-2" />;
  }

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <FollowListBase
      pubkeys={data?.profiles.map(a => a.pubkey)?.slice(0, count) ?? []}
      title={title}
      showFollowAll={true}
      className="flex flex-col gap-2"
      profilePreviewProps={{
        options: {
          about: true,
        },
      }}
      {...followListProps}
    />
  );
}
