import { NostrLink, UserMetadata } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import React from "react";

import ProfilePreview from "@/Components/User/ProfilePreview";

export default function Nip28ChatProfile({ id, onClick }: { id: string; onClick: (id: string) => void }) {
  const channel = useEventFeed(new NostrLink(CONFIG.eventLinkPrefix, id, 40));
  if (channel) {
    const meta = JSON.parse(channel.content) as UserMetadata;
    return (
      <ProfilePreview
        pubkey=""
        profile={meta}
        options={{ about: false, linkToProfile: false }}
        actions={<></>}
        onClick={() => onClick(id)}
      />
    );
  }
}
