import { ProxyImg } from "Element/ProxyImg";
import React, { MouseEvent, useState } from "react";

import "./MediaElement.css";
import Modal from "Element/Modal";
import Icon from "Icons/Icon";

/*
[
  "imeta",
  "url https://nostr.build/i/148e3e8cbe29ae268b0d6aad0065a086319d3c3b1fdf8b89f1e2327d973d2d05.jpg",
  "blurhash e6A0%UE2t6D*R%?u?a9G?aM|~pM|%LR*RjR-%2NG%2t7_2R*%1IVWB",
  "dim 3024x4032"
],
*/
interface MediaElementProps {
  mime: string;
  url: string;
  magnet?: string;
  sha256?: string;
  blurHash?: string;
}

export function MediaElement(props: MediaElementProps) {
  if (props.mime.startsWith("image/")) {
    return (
      <SpotlightMedia>
        <ProxyImg key={props.url} src={props.url} />
      </SpotlightMedia>
    );
  } else if (props.mime.startsWith("audio/")) {
    return <audio key={props.url} src={props.url} controls />;
  } else if (props.mime.startsWith("video/")) {
    return (
      <SpotlightMedia>
        <video key={props.url} src={props.url} controls />
      </SpotlightMedia>
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

export function SpotlightMedia({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);

  function onClick(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    setShowModal(s => !s);
  }

  function onClose(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    setShowModal(false);
  }

  return (
    <>
      {showModal && (
        <Modal onClose={onClose} className="spotlight">
          <div className="close" onClick={onClose}>
            <Icon name="close" />
          </div>
          {children}
        </Modal>
      )}
      <div onClick={onClick}>{children}</div>
    </>
  );
}
