import Hls from "hls.js";
import { HTMLProps, useEffect, useRef } from "react";

export function LiveVideoPlayer(props: HTMLProps<HTMLVideoElement>) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (props.src && video.current && !video.current.src && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(props.src);
      hls.attachMedia(video.current);
      return () => hls.destroy();
    }
  }, [video, props]);
  return (
    <div className="w-max">
      <video className="w-max" ref={video} controls={true} />
    </div>
  );
}
