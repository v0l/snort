import { IMeta } from "@snort/system";
import classNames from "classnames";
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

import { ProxyImg, ProxyImgProps } from "@/Components/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";

export interface MediaElementProps {
  mime: string;
  url: string;
  meta?: IMeta;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  size?: number;
  style?: CSSProperties
}

interface AudioElementProps {
  url: string;
}

interface VideoElementProps {
  url: string;
  meta?: IMeta;
}

export type ImageElementProps = ProxyImgProps & {
  meta?: IMeta;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

const AudioElement = ({ url }: AudioElementProps) => {
  return <audio key={url} src={url} controls />;
};

const ImageElement = ({ src, meta, onMediaClick, size, ...props }: ImageElementProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const iMetaScaledHeight = useMemo(() => {
    if (meta?.height && meta.width && imageRef.current) {
      const scale = imageRef.current.offsetWidth / meta.width;
      return `${Math.min(document.body.clientHeight * 0.8, meta.height * scale)}px`;
    }
  }, [imageRef, meta]);
  console.debug(iMetaScaledHeight);

  const [alternatives, setAlternatives] = useState<Array<string>>(meta?.fallback ?? []);
  const [currentUrl, setCurrentUrl] = useState(src);
  return (<ProxyImg
    {...props}
    key={currentUrl}
    src={currentUrl}
    sha256={meta?.sha256}
    onClick={onMediaClick}
    className={classNames("max-h-[80vh] w-full h-full object-contain object-center", {
      "md:max-h-[510px]": !meta && !CONFIG.media.preferLargeMedia,
    })}
    ref={imageRef}
    onError={() => {
      const next = alternatives.at(0);
      if (next) {
        console.warn("IMG FALLBACK", "Failed to load url, trying next: ", next);
        setAlternatives(z => z.filter(y => y !== next));
        setCurrentUrl(next);
      }
    }}
  />
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
    <div
      ref={videoContainerRef}
      className={classNames("flex justify-center items-center -mx-4 md:mx-0 my-2", {
        "md:h-[510px]": !CONFIG.media.preferLargeMedia,
      })}>
      <video
        crossOrigin="anonymous"
        ref={videoRef}
        loop={true}
        muted={!isMobile}
        src={url}
        controls
        poster={proxy(url)}
        className={classNames("max-h-[80vh]", { "md:max-h-[510px]": !CONFIG.media.preferLargeMedia })}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
};

export function MediaElement(props: MediaElementProps) {
  if (props.mime.startsWith("image/")) {
    return <ImageElement src={props.url} meta={props.meta} onMediaClick={props.onMediaClick} size={props.size} style={props.style} />;
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
        className="text-highlight no-underline hover:underline">
        {props.url}
      </a>
    );
  }
}
