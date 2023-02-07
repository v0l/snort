import "./Modal.css";
import { useEffect, useRef } from "react";
import * as React from "react";

export interface ModalProps {
  className?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

function useOnClickOutside(
  ref: React.MutableRefObject<Element | null>,
  onClickOutside: () => void
) {
  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (ref && ref.current && !ref.current.contains(ev.target as Node)) {
        onClickOutside();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);
}

export default function Modal(props: ModalProps) {
  const ref = useRef(null);
  const onClose = props.onClose || (() => undefined);
  const className = props.className || "";
  useOnClickOutside(ref, onClose);

  useEffect(() => {
    document.body.classList.add("scroll-lock");
    return () => document.body.classList.remove("scroll-lock");
  }, []);

  return (
    <div className={`modal ${className}`}>
      <div ref={ref} className="modal-body">
        {props.children}
      </div>
    </div>
  );
}
