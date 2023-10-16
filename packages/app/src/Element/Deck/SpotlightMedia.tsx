import "./SpotlightMedia.css";
import { useEffect, useMemo, useState } from "react";
import Modal from "Element/Modal";
import Icon from "Icons/Icon";
import { ProxyImg } from "Element/ProxyImg";

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
    <div className="spotlight">
      <ProxyImg src={image} />
      <div className="details">
        {props.images.length > 1 && `${idx + 1}/${props.images.length}`}
        <Icon name="x-close" size={24} onClick={props.onClose} />
      </div>
      {props.images.length > 1 && (
        <>
          <Icon
            className="left"
            name="arrowFront"
            size={24}
            onClick={e => {
              e.stopPropagation();
              dec();
            }}
          />
          <Icon
            className="right"
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
  return (
    <Modal id="spotlight" onClick={props.onClose} onClose={props.onClose} className="spotlight">
      <SpotlightMedia {...props} />
    </Modal>
  );
}
