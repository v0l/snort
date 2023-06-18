import Hls from "hls.js";
import { HTMLProps, useEffect, useRef } from "react";

export function LiveVideoPlayer(props: HTMLProps<HTMLVideoElement> & { stream: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (props.stream && video.current && !video.current.src && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(props.stream);
      hls.attachMedia(video.current);
      return () => hls.destroy();
    }
  }, [video, props]);
  return (
    <div>
      <video ref={video} {...props} controls={true} />
    </div>
  );
}
