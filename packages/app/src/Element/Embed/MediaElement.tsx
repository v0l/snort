import { ProxyImg } from "Element/ProxyImg";
import React from "react";

/*
[
  "imeta",
  "url https://nostr.build/i/148e3e8cbe29ae268b0d6aad0065a086319d3c3b1fdf8b89f1e2327d973d2d05.jpg",
  "blurhash e6A0%UE2t6D*R%?u?a9G?aM|~pM|%LR*RjR-%2NG%2t7_2R*%1IVWB",
  "dim 3024x4032"
],
*/
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
