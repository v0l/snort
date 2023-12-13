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

interface AudioElementProps {
  url: string;
}

interface VideoElementProps {
  url: string;
  meta?: IMeta;
}

interface ImageElementProps {
  url: string;
  meta?: IMeta;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

const AudioElement = ({ url }: AudioElementProps) => {
  return <audio key={url} src={url} controls />;
};

const ImageElement = ({ url, meta, onMediaClick }: ImageElementProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const style = useMemo(() => {
    const style = {} as CSSProperties;
    if (meta?.height && meta.width && imageRef.current) {
      const scale = imageRef.current.offsetWidth / meta.width;
      style.height = `${meta.height * scale}px`;
    }
    return style;
  }, [imageRef.current]);

  return (
    <div className={classNames("flex items-center -mx-4 md:mx-0 my-2", { "md:h-[510px]": !meta })}>
      <ProxyImg
        key={url}
        src={url}
        onClick={onMediaClick}
        className={classNames("max-h-[80vh] w-full h-full object-contain object-left md:rounded-sm", {
          "md:max-h-[510px]": !meta,
        })}
        style={style}
        ref={imageRef}
      />
    </div>
  );
};

const VideoElement = ({ url }: VideoElementProps) => {
  const { proxy } = useImgProxy();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { ref: videoContainerRef, inView } = useInView({ threshold: 0.33 });
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (isMobile || !videoRef.current) {
      return;
    }
    if (inView) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [inView]);

  return (
    <div ref={videoContainerRef} className="flex justify-center items-center -mx-4 md:mx-0 md:h-[510px] my-2">
      <video
        ref={videoRef}
        loop={true}
        muted={!isMobile}
        src={url}
        controls
        poster={proxy(url)}
        className="max-h-[80vh] md:max-h-[510px] md:rounded-sm"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
};

export function MediaElement(props: MediaElementProps) {
  if (props.mime.startsWith("image/")) {
    return <ImageElement url={props.url} meta={props.meta} onMediaClick={props.onMediaClick} />;
  } else if (props.mime.startsWith("audio/")) {
    return <AudioElement url={props.url} />;
  } else if (props.mime.startsWith("video/")) {
    return <VideoElement url={props.url} />;
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
