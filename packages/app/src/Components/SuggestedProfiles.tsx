import { useState } from "react";
import { FormattedMessage } from "react-intl";

import PageSpinner from "@/Components/PageSpinner";
import TrendingUsers from "@/Components/Trending/TrendingUsers";
import FollowListBase from "@/Components/User/FollowListBase";
import NostrBandApi from "@/External/NostrBand";
import useCachedFetch from "@/Hooks/useCachedFetch";
import useLogin from "@/Hooks/useLogin";

import { ErrorOrOffline } from "./ErrorOrOffline";
import { hexToBech32, NostrPrefix } from "@snort/shared";

enum Provider {
  NostrBand = 1,
}

export default function SuggestedProfiles() {
  const publicKey = useLogin(s => s.publicKey);
  const [provider, setProvider] = useState(Provider.NostrBand);

  const getUrlAndKey = () => {
    if (!publicKey) return { url: null, key: null };
    switch (provider) {
      case Provider.NostrBand: {
        const api = new NostrBandApi();
        const url = api.suggestedFollowsUrl(hexToBech32(NostrPrefix.PublicKey, publicKey));
        return { url, key: `nostr-band-${url}` };
      }
      default:
        return { url: null, key: null };
    }
  };

  const { url, key } = getUrlAndKey();
  const {
    data: userList,
    error,
    isLoading,
  } = useCachedFetch(url, key, data => {
    switch (provider) {
      case Provider.NostrBand:
        return data.profiles.map(a => a.pubkey);
      default:
        return [];
    }
  });

  if (error) return <ErrorOrOffline error={error} onRetry={() => {}} />;
  if (isLoading) return <PageSpinner />;
  if (userList.length === 0) return <TrendingUsers title={""} />;

  return (
    <>
      <div className="flex items-center justify-between layer-1">
        <FormattedMessage defaultMessage="Provider" />
        <select onChange={e => setProvider(Number(e.target.value))}>
          <option value={Provider.NostrBand}>nostr.band</option>
          {/*<option value={Provider.SemisolDev}>semisol.dev</option>*/}
        </select>
      </div>
      <FollowListBase
        pubkeys={userList}
        profilePreviewProps={{
          options: {
            about: true,
          },
        }}
      />
    </>
  );
}
