import "./Modal.css";
import { ReactNode } from "react";

export interface ModalProps {
  id: string;
  className?: string;
  onClose?: () => void;
  children: ReactNode;
}

export default function Modal(props: ModalProps) {
  return <div className={`modal${props.className ? ` ${props.className}` : ""}`} onClick={props.onClose}>
    <div className="modal-body" onClick={e => e.stopPropagation()}>
      {props.children}
    </div>
  </div>;
}
