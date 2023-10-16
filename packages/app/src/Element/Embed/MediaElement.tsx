import { ProxyImg } from "Element/ProxyImg";
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
  if (props.mime.startsWith("image/")) {
    return <ProxyImg key={props.url} src={props.url} onClick={props.onMediaClick} />;
  } else if (props.mime.startsWith("audio/")) {
    return <audio key={props.url} src={props.url} controls />;
  } else if (props.mime.startsWith("video/")) {
    return <video key={props.url} src={props.url} controls />;
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
