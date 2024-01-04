import { HexKey, NostrPrefix } from "@snort/system";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import PageSpinner from "@/Components/PageSpinner";
import TrendingUsers from "@/Components/Trending/TrendingUsers";
import FollowListBase from "@/Components/User/FollowListBase";
import NostrBandApi from "@/External/NostrBand";
import SemisolDevApi from "@/External/SemisolDev";
import useCachedFetch from "@/Hooks/useCachedFetch";
import useLogin from "@/Hooks/useLogin";
import { hexToBech32 } from "@/Utils";

import { ErrorOrOffline } from "./ErrorOrOffline";

enum Provider {
  NostrBand = 1,
  SemisolDev = 2,
}

export default function SuggestedProfiles() {
  const login = useLogin(s => ({ publicKey: s.publicKey, follows: s.follows.item }));
  const [provider, setProvider] = useState(Provider.NostrBand);

  const getUrlAndKey = () => {
    if (!login.publicKey) return { url: null, key: null };
    switch (provider) {
      case Provider.NostrBand: {
        const api = new NostrBandApi();
        const url = api.suggestedFollowsUrl(hexToBech32(NostrPrefix.PublicKey, login.publicKey));
        return { url, key: `nostr-band-${url}` };
      }
      case Provider.SemisolDev: {
        const api = new SemisolDevApi();
        const url = api.suggestedFollowsUrl(login.publicKey, login.follows);
        return { url, key: `semisol-dev-${url}` };
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
      case Provider.SemisolDev:
        return data.recommendations.sort(a => a[1]).map(a => a[0]);
      default:
        return [];
    }
  });

  if (error) return <ErrorOrOffline error={error} onRetry={() => {}} />;
  if (isLoading) return <PageSpinner />;
  if (userList.length === 0) return <TrendingUsers title={""} />;

  return (
    <>
      <div className="flex items-center justify-between bg-superdark p br">
        <FormattedMessage defaultMessage="Provider" id="xaj9Ba" />
        <select onChange={e => setProvider(Number(e.target.value))}>
          <option value={Provider.NostrBand}>nostr.band</option>
          {/*<option value={Provider.SemisolDev}>semisol.dev</option>*/}
        </select>
      </div>
      <FollowListBase pubkeys={userList as HexKey[]} showAbout={true} />
    </>
  );
}
