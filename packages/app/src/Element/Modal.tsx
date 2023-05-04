import "./Modal.css";
import { useEffect, MouseEventHandler, ReactNode } from "react";

export interface ModalProps {
  className?: string;
  onClose?: MouseEventHandler;
  children: ReactNode;
}

export default function Modal(props: ModalProps) {
  const onClose = props.onClose || (() => undefined);
  const className = props.className || "";

  useEffect(() => {
    document.body.classList.add("scroll-lock");
    return () => document.body.classList.remove("scroll-lock");
  }, []);

  return (
    <div className={`modal ${className}`} onClick={onClose}>
      <div className="modal-body" onClick={e => e.stopPropagation()}>
        {props.children}
      </div>
    </div>
  );
}
