import "./SpotlightMedia.css";
import { useMemo, useState } from "react";
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
    <Modal onClose={props.onClose} className="spotlight">
      <ProxyImg src={image} />
      <div className="details">
        {idx + 1}/{props.images.length}
        <Icon name="x-close" size={24} onClick={props.onClose} />
      </div>
      {props.images.length > 1 && (
        <>
          <Icon className="left" name="arrowFront" size={24} onClick={() => dec()} />
          <Icon className="right" name="arrowFront" size={24} onClick={() => inc()} />
        </>
      )}
    </Modal>
  );
}
