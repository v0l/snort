import { FormattedMessage } from "react-intl";

import PageSpinner from "@/Components/PageSpinner";
import FollowListBase from "@/Components/User/FollowListBase";
import useDVMLinks from "@/Hooks/useDvmLinks";
import { NostrPrefix } from "@snort/shared";
import { NostrLink } from "@snort/system";

const vertexParams = {
  sort: "globalPagerank",
  limit: "30",
};
const relays = ["wss://relay.vertexlab.io"];

export default function SuggestedProfiles() {
  const { links } = useDVMLinks(5313, undefined, undefined, vertexParams, relays, c => {
    const rsp = JSON.parse(c) as Array<{ pubkey: string; rank: number }>;
    return Object.values(rsp).map(a => NostrLink.publicKey(a.pubkey));
  });
  if (!links) return <PageSpinner />;
  return (
    <>
      <FollowListBase
        className="px-2"
        pubkeys={
          links?.filter(a => a.type === NostrPrefix.Profile || a.type === NostrPrefix.PublicKey).map(a => a.id) ?? []
        }
        profilePreviewProps={{
          options: {
            about: true,
          },
        }}
      />
    </>
  );
}
