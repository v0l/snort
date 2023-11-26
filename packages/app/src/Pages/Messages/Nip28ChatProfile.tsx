import { useEventFeed } from "@snort/system-react";
import { NostrLink, UserMetadata } from "@snort/system";
import ProfilePreview from "@/Element/User/ProfilePreview";
import React from "react";

export default function Nip28ChatProfile({ id, onClick }: { id: string; onClick: (id: string) => void }) {
  const channel = useEventFeed(new NostrLink(CONFIG.eventLinkPrefix, id, 40));
  if (channel?.data) {
    const meta = JSON.parse(channel.data.content) as UserMetadata;
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
