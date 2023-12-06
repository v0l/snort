import { ProxyImg } from "@/Element/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";
import React from "react";

interface MediaElementProps {
  mime: string;
  url: string;
  magnet?: string;
  sha256?: string;
  blurHash?: string;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export function MediaElement(props: MediaElementProps) {
  const { proxy } = useImgProxy();

  const autoplay = window.innerWidth >= 768;

  if (props.mime.startsWith("image/")) {
    return (
      // constant height container avoids layout shift when images load
      <div className="-mx-4 md:mx-0 my-3 md:h-80 flex items-center justify-center">
        <ProxyImg key={props.url} src={props.url} onClick={props.onMediaClick} className="max-h-[80vh] md:max-h-80" />
      </div>
    );
  } else if (props.mime.startsWith("audio/")) {
    return <audio key={props.url} src={props.url} controls />;
  } else if (props.mime.startsWith("video/")) {
    return (
      <div className="-mx-4 md:mx-0 my-3 md:h-80 flex items-center justify-center">
        <video
          autoPlay={autoplay}
          loop={true}
          muted={autoplay}
          key={props.url}
          src={props.url}
          controls
          poster={proxy(props.url)}
          className="max-h-[80vh] md:max-h-80"
        />
      </div>
    );
  } else {
    return (
      <a
        key={props.url}
        href={props.url}
        onClick={e => e.stopPropagation()}
        target="_blank"
        rel="noreferrer"
        className="ext">
        {props.url}
      </a>
    );
  }
}
