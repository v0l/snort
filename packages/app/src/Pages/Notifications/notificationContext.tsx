import { EventKind, type NostrLink } from "@snort/system";
import { useEventFeed } from "@snort/system-react";

import { LiveEvent } from "@/Components/LiveStream/LiveEvent";
import Text from "@/Components/Text/Text";
import ProfilePreview from "@/Components/User/ProfilePreview";
import { NostrPrefix } from "@snort/shared";
import { FormattedMessage } from "react-intl";

export function NotificationContext({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);
  if (link.type === NostrPrefix.PublicKey) {
    return <ProfilePreview pubkey={link.id} actions={<></>} />;
  }
  if (!ev)
    return (
      <>
        <FormattedMessage defaultMessage="Loading context..." />
      </>
    );
  if (ev.kind === EventKind.LiveEvent) {
    return <LiveEvent ev={ev} />;
  }
  return (
    <Text
      id={ev.id}
      content={ev.content}
      tags={ev.tags}
      creator={ev.pubkey}
      truncate={160}
      disableLinkPreview={true}
      disableGallery={true}
      className="text-neutral-400"
    />
  );
}
