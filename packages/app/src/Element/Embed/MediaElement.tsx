import { ProxyImg } from "@/Element/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";
import { IMeta } from "@snort/system";
import React, { CSSProperties, useMemo, useRef } from "react";
import classNames from "classnames";

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
      <div className={classNames("flex justify-center items-center -mx-4 md:mx-0 my-2", { "md:h-80": !props.meta })}>
        <ProxyImg
          key={props.url}
          src={props.url}
          onClick={props.onMediaClick}
          className={classNames("max-h-[80vh]", { "md:max-h-80": !props.meta })}
          style={style}
          ref={ref}
        />
      </div>
    );
  } else if (props.mime.startsWith("audio/")) {
    return <audio key={props.url} src={props.url} controls />;
  } else if (props.mime.startsWith("video/")) {
    return (
      <div className="flex justify-center items-center -mx-4 md:mx-0 md:h-80 my-2">
        <video
          autoPlay={autoplay}
          loop={true}
          muted={autoplay}
          key={props.url}
          src={props.url}
          controls
          poster={proxy(props.url)}
          className="max-h-[80vh] md:max-h-80"
          style={style}
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
