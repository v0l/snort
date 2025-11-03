import { FormattedMessage } from "react-intl";

import PageSpinner from "@/Components/PageSpinner";
import FollowListBase from "@/Components/User/FollowListBase";
import useDVMLinks from "@/Hooks/useDvmLinks";
import { NostrPrefix } from "@snort/shared";
import { NostrLink } from "@snort/system";
import ProfileImage from "./User/ProfileImage";

const vertexParams = {
  sort: "globalPagerank",
  limit: "30",
};
const relays = ["wss://relay.vertexlab.io"];

const vertexParser = (c: string) => {
  const rsp = JSON.parse(c) as Array<{ pubkey: string; rank: number }>;
  return Object.values(rsp).map(a => NostrLink.publicKey(a.pubkey));
};

export default function SuggestedProfiles() {
  const { result, links } = useDVMLinks(5313, undefined, undefined, vertexParams, relays, vertexParser);
  if (!links) return <PageSpinner />;
  return (
    <div className="px-2">
      {result && <div className="flex flex-col gap-2">
        <h3><FormattedMessage defaultMessage="Suggestions by" /></h3>
        <ProfileImage pubkey={result.pubkey} />
      </div>}
      <FollowListBase
        pubkeys={
          links?.filter(a => a.type === NostrPrefix.Profile || a.type === NostrPrefix.PublicKey).map(a => a.id) ?? []
        }
        profilePreviewProps={{
          options: {
            about: true,
          },
        }}
      />
    </div>
  );
}
