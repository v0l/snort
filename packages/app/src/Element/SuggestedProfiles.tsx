import { useEffect, useState } from "react";
import { HexKey, NostrPrefix } from "@snort/system";
import { FormattedMessage } from "react-intl";

import FollowListBase from "Element/User/FollowListBase";
import PageSpinner from "Element/PageSpinner";
import NostrBandApi from "External/NostrBand";
import SemisolDevApi from "External/SemisolDev";
import useLogin from "Hooks/useLogin";
import { hexToBech32 } from "SnortUtils";
import { ErrorOrOffline } from "./ErrorOrOffline";

enum Provider {
  NostrBand = 1,
  SemisolDev = 2,
}

export default function SuggestedProfiles() {
  const login = useLogin();
  const [userList, setUserList] = useState<HexKey[]>();
  const [provider, setProvider] = useState(Provider.NostrBand);
  const [error, setError] = useState<Error>();

  async function loadSuggestedProfiles() {
    if (!login.publicKey) return;
    setUserList(undefined);
    setError(undefined);

    try {
      switch (provider) {
        case Provider.NostrBand: {
          const api = new NostrBandApi();
          const users = await api.sugguestedFollows(hexToBech32(NostrPrefix.PublicKey, login.publicKey));
          const keys = users.profiles.map(a => a.pubkey);
          setUserList(keys);
          break;
        }
        case Provider.SemisolDev: {
          const api = new SemisolDevApi();
          const users = await api.sugguestedFollows(login.publicKey, login.follows.item);
          const keys = users.recommendations.sort(a => a[1]).map(a => a[0]);
          setUserList(keys);
          break;
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
    }
  }

  useEffect(() => {
    loadSuggestedProfiles();
  }, [login, provider]);

  return (
    <>
      <div className="flex items-center justify-between bg-superdark p br">
        <FormattedMessage defaultMessage="Provider" />
        <select onChange={e => setProvider(Number(e.target.value))}>
          <option value={Provider.NostrBand}>nostr.band</option>
          {/*<option value={Provider.SemisolDev}>semisol.dev</option>*/}
        </select>
      </div>
      {error && <ErrorOrOffline error={error} onRetry={loadSuggestedProfiles} />}
      {userList && <FollowListBase pubkeys={userList} showAbout={true} />}
      {!userList && !error && <PageSpinner />}
    </>
  );
}
