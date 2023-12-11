import { ProxyImg } from "@/Element/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";
import { IMeta } from "@snort/system";
import React, { CSSProperties, useMemo, useRef } from "react";

interface MediaElementProps {
  mime: string;
  url: string;
  meta?: IMeta;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export function MediaElement(props: MediaElementProps) {
  const { proxy } = useImgProxy();
  const ref = useRef<HTMLImageElement | null>(null);
  const autoplay = window.innerWidth >= 768;

  const style = useMemo(() => {
    const style = {} as CSSProperties;
    if (props.meta?.height && props.meta.width && ref.current) {
      const scale = ref.current.offsetWidth / props.meta.width;
      style.height = `${props.meta.height * scale}px`;
    }
    return style;
  }, [ref.current]);

  if (props.mime.startsWith("image/")) {
    return (
      <ProxyImg
        key={props.url}
        src={props.url}
        onClick={props.onMediaClick}
        className="max-h-[80vh] mx-auto"
        style={style}
        ref={ref}
      />
    );
  } else if (props.mime.startsWith("audio/")) {
    return <audio key={props.url} src={props.url} controls />;
  } else if (props.mime.startsWith("video/")) {
    return (
      <video
        autoPlay={autoplay}
        loop={true}
        muted={autoplay}
        key={props.url}
        src={props.url}
        controls
        poster={proxy(props.url)}
        className="max-h-[80vh] mx-auto"
        style={style}
      />
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
