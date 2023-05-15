import { useEffect, useState } from "react";
import { HexKey, NostrPrefix } from "@snort/nostr";
import { FormattedMessage } from "react-intl";

import FollowListBase from "Element/FollowListBase";
import PageSpinner from "Element/PageSpinner";
import NostrBandApi from "External/NostrBand";
import useLogin from "Hooks/useLogin";
import { hexToBech32 } from "Util";

export default function SuggestedProfiles() {
  const login = useLogin();
  const [userList, setUserList] = useState<HexKey[]>();

  async function loadSuggestedProfiles() {
    const api = new NostrBandApi();
    const users = await api.sugguestedFollows(hexToBech32(NostrPrefix.PublicKey, login.publicKey));
    const keys = users.profiles.map(a => a.pubkey);
    setUserList(keys);
  }

  useEffect(() => {
    loadSuggestedProfiles().catch(console.error);
  }, []);

  if (!userList) return <PageSpinner />;

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Suggested Follows" />
      </h3>
      <FollowListBase pubkeys={userList} showAbout={true} />
    </>
  );
}
