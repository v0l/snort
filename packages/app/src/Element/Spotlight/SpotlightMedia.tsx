import { useEffect, useMemo, useState } from "react";
import Modal from "@/Element/Modal";
import Icon from "@/Icons/Icon";
import { ProxyImg } from "@/Element/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";

interface SpotlightMediaProps {
  images: Array<string>;
  idx: number;
  onClose: () => void;
}

const videoSuffixes = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];

export function SpotlightMedia(props: SpotlightMediaProps) {
  const { proxy } = useImgProxy();
  const [idx, setIdx] = useState(props.idx);

  const image = useMemo(() => {
    return props.images.at(idx % props.images.length);
  }, [idx, props]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          dec();
          break;
        }
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          inc();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function dec() {
    setIdx(s => {
      if (s - 1 === -1) {
        return props.images.length - 1;
      } else {
        return s - 1;
      }
    });
  }

  function inc() {
    setIdx(s => {
      if (s + 1 === props.images.length) {
        return 0;
      } else {
        return s + 1;
      }
    });
  }

  const isVideo = useMemo(() => {
    return image && videoSuffixes.some(suffix => image.endsWith(suffix));
  }, [image]);

  const mediaEl = useMemo(() => {
    if (image && isVideo) {
      return (
        <video
          src={image}
          poster={proxy(image)}
          autoPlay={true}
          loop={true}
          controls={true}
          className="max-h-screen max-w-full"
        />
      );
    } else {
      return <ProxyImg src={image} className="max-h-screen max-w-full" />;
    }
  }, [image, isVideo]);

  const onClickBg = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <div className="relative h-screen flex items-center flex-1 justify-center" onClick={onClickBg}>
      {mediaEl}
      <div className="select-none absolute flex flex-row items-center gap-4 left-0 top-0 p-4">
        <span
          className="p-2 bg-bg-color rounded-full cursor-pointer opacity-80 hover:opacity-70"
          onClick={props.onClose}>
          <Icon name="x-close" size={24} />
        </span>
      </div>
      <div className="select-none absolute flex flex-row items-center gap-4 right-0 top-0 p-4">
        {props.images.length > 1 && `${idx + 1}/${props.images.length}`}
      </div>
      {props.images.length > 1 && (
        <>
          <Icon
            className="absolute left-2 top-1/2 rotate-180 cursor-pointer"
            name="arrowFront"
            size={24}
            onClick={e => {
              e.stopPropagation();
              dec();
            }}
          />
          <Icon
            className="absolute right-2 top-1/2 cursor-pointer"
            name="arrowFront"
            size={24}
            onClick={e => {
              e.stopPropagation();
              inc();
            }}
          />
        </>
      )}
    </div>
  );
}

export function SpotlightMediaModal(props: SpotlightMediaProps) {
  const onClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onClose();
  };
  return (
    <Modal
      id="spotlight"
      onClick={props.onClose}
      onClose={onClose}
      className="spotlight"
      bodyClassName="h-screen w-screen flex items-center justify-center">
      <SpotlightMedia {...props} />
    </Modal>
  );
}
