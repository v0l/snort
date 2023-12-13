import { ProxyImg } from "@/Element/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";
import { IMeta } from "@snort/system";
import React, { CSSProperties, useEffect, useMemo, useRef } from "react";
import classNames from "classnames";
import { useInView } from "react-intersection-observer";

interface MediaElementProps {
  mime: string;
  url: string;
  meta?: IMeta;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export function MediaElement(props: MediaElementProps) {
  const { proxy } = useImgProxy();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { ref: videoContainerRef, inView } = useInView({ threshold: 1 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoplay = window.innerWidth >= 768;

  useEffect(() => {
    if (!autoplay || !videoRef.current) {
      return;
    }
    if (inView) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [inView]);

  const style = useMemo(() => {
    const style = {} as CSSProperties;
    if (props.meta?.height && props.meta.width && imageRef.current) {
      const scale = imageRef.current.offsetWidth / props.meta.width;
      style.height = `${props.meta.height * scale}px`;
    }
    return style;
  }, [imageRef.current]);

  if (props.mime.startsWith("image/")) {
    return (
      <div className={classNames("flex justify-center items-center -mx-4 md:mx-0 my-2", { "md:h-80": !props.meta })}>
        <ProxyImg
          key={props.url}
          src={props.url}
          onClick={props.onMediaClick}
          className={classNames("max-h-[80vh]", { "md:max-h-80": !props.meta })}
          style={style}
          ref={imageRef}
        />
      </div>
    );
  } else if (props.mime.startsWith("audio/")) {
    return <audio key={props.url} src={props.url} controls />;
  } else if (props.mime.startsWith("video/")) {
    return (
      <div ref={videoContainerRef} className="flex justify-center items-center -mx-4 md:mx-0 md:h-80 my-2">
        <video
          ref={videoRef}
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
