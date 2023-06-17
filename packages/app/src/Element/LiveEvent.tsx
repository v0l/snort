import { NostrEvent } from "@snort/system";
import { findTag } from "SnortUtils";
import { LiveVideoPlayer } from "Element/LiveVideoPlayer";

export function LiveEvent({ ev }: { ev: NostrEvent }) {
  const stream = findTag(ev, "streaming");
  if (stream) {
    return <LiveVideoPlayer src={stream} />;
  }
  return null;
}
