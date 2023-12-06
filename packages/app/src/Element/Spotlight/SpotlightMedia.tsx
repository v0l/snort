import { useEffect, useMemo, useState } from "react";
import Modal from "@/Element/Modal";
import Icon from "@/Icons/Icon";
import { ProxyImg } from "@/Element/ProxyImg";

interface SpotlightMediaProps {
  images: Array<string>;
  idx: number;
  onClose: () => void;
}

export function SpotlightMedia(props: SpotlightMediaProps) {
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

  return (
    <>
      <ProxyImg src={image} className="max-h-screen max-w-full" />
      <div className="select-none absolute flex flex-row items-center gap-4 cursor-pointer left-0 top-0 p-4">
        <Icon name="x-close" size={24} onClick={props.onClose} />
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
    </>
  );
}

export function SpotlightMediaModal(props: SpotlightMediaProps) {
  return (
    <Modal
      id="spotlight"
      onClick={props.onClose}
      onClose={props.onClose}
      className="spotlight"
      bodyClassName="h-screen w-screen flex items-center justify-center">
      <SpotlightMedia {...props} />
    </Modal>
  );
}
