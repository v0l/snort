import { dedupe, unixNow } from "@snort/shared";
import { type EventKind, NostrLink, RequestBuilder, type TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { AvatarGroup } from "../User/AvatarGroup";

export function NestsParticipants({ ev }: { ev: TaggedNostrEvent }) {
  const link = NostrLink.fromEvent(ev);
  const sub = useMemo(() => {
    const sub = new RequestBuilder(`livekit-participants:${link.tagKey}`);
    sub.withOptions({ leaveOpen: true });
    sub
      .withFilter()
      .replyToLink([link])
      .kinds([10_312 as EventKind])
      .since(unixNow() - 600);
    return sub;
  }, [link.tagKey]);

  const presense = useRequestBuilder(sub);
  const filteredPresence = presense.filter(ev => ev.created_at > unixNow() - 600);
  return <AvatarGroup ids={dedupe(filteredPresence.map(a => a.pubkey)).slice(0, 5)} size={32} />;
}
