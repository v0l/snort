import "./Modal.css";
import { ReactNode, useEffect } from "react";

export interface ModalProps {
  id: string;
  className?: string;
  onClose?: (e: React.MouseEvent | KeyboardEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
}

export default function Modal(props: ModalProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.onClose) {
      props.onClose(e);
    }
  };

  useEffect(() => {
    document.body.classList.add("scroll-lock");
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("scroll-lock");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className={`modal${props.className ? ` ${props.className}` : ""}`} onClick={props.onClose}>
      <div className="modal-body" onClick={props.onClose}>
        <div
          onClick={e => {
            e.stopPropagation();
            props.onClick?.(e);
          }}>
          {props.children}
        </div>
      </div>
    </div>
  );
}
