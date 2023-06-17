import { NostrEvent } from "@snort/system";
import { findTag } from "SnortUtils";
import { useEffect, useRef } from "react";
import Hls from "hls.js";

export function LiveEvent({ ev }: { ev: NostrEvent }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const stream = findTag(ev, "streaming");
    if (stream && video.current && !video.current.src && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(stream);
      hls.attachMedia(video.current);
    }
  }, [video, ev]);
  return (
    <div>
      <video ref={video} controls={true} autoPlay={true} muted={true} />
    </div>
  );
}
