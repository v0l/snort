import { Nip94Tags } from "@snort/system";
import classNames from "classnames";
import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

import { ProxyImg, ProxyImgProps } from "@/Components/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";

export interface MediaElementProps {
  mime: string;
  src: string;
  meta?: Nip94Tags;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onFallback?: (url: string) => void;
  size?: number;
  style?: CSSProperties;
}

interface AudioElementProps {
  src: string;
}

interface VideoElementProps {
  src: string;
  meta?: Nip94Tags;
}

export type ImageElementProps = ProxyImgProps & {
  meta?: Nip94Tags;
  onMediaClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onFallback?: (url: string) => void;
};

const AudioElement = ({ src }: AudioElementProps) => {
  return <audio key={src} src={src} controls />;
};

const ImageElement = ({ src, meta, onMediaClick, size, onFallback, ...props }: ImageElementProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [alternatives, setAlternatives] = useState<Array<string>>(meta?.fallback ?? []);
  const [currentUrl, setCurrentUrl] = useState(src);
  if ("creator" in props) {
    delete props["creator"];
  }
  if ("mime" in props) {
    delete props["mime"];
  }
  return (
    <ProxyImg
      {...props}
      key={currentUrl}
      src={currentUrl}
      sha256={meta?.hash}
      onClick={onMediaClick}
      className={classNames("relative max-h-[80vh] w-full h-full object-contain object-center", {
        "md:max-h-[510px]": !meta && !CONFIG.media.preferLargeMedia,
      })}
      ref={imageRef}
      onError={() => {
        const next = alternatives.at(0);
        if (next) {
          console.warn("IMG FALLBACK", "Failed to load url, trying next: ", next);
          setAlternatives(z => z.filter(y => y !== next));
          setCurrentUrl(next);
          onFallback?.(next);
        }
      }}
    />
  );
};

const VideoElement = ({ src }: VideoElementProps) => {
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
      className={classNames("flex justify-center items-center", {
        "md:h-[510px]": !CONFIG.media.preferLargeMedia,
        "-mx-3": CONFIG.media.preferLargeMedia,
      })}>
      <video
        crossOrigin="anonymous"
        ref={videoRef}
        loop={true}
        muted={!isMobile}
        src={src}
        controls
        poster={proxy(src)}
        className={classNames("max-h-[80vh]", { "md:max-h-[510px]": !CONFIG.media.preferLargeMedia })}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
};

export function MediaElement(props: MediaElementProps) {
  if (props.mime.startsWith("image/")) {
    return <ImageElement {...props} />;
  } else if (props.mime.startsWith("audio/")) {
    return <AudioElement {...props} />;
  } else if (props.mime.startsWith("video/")) {
    return <VideoElement {...props} />;
  } else {
    return (
      <a
        key={props.src}
        href={props.src}
        onClick={e => e.stopPropagation()}
        target="_blank"
        rel="noreferrer"
        className="text-highlight no-underline hover:underline">
        {props.src}
      </a>
    );
  }
}
