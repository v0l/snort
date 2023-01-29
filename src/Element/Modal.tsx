import "./Modal.css";
import { useEffect, useRef } from "react"
import * as React from "react";

export interface ModalProps {
    className?: string
    onClose?: () => void,
    children: React.ReactNode
}

function useOnClickOutside(ref: any, onClickOutside: () => void) {
  useEffect(() => {
    function handleClickOutside(ev: any) {
      if (ref && ref.current && !ref.current.contains(ev.target)) {
        onClickOutside()
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
    const onClose = props.onClose || (() => { });
    const className = props.className || ''
    useOnClickOutside(ref, onClose)

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
    )
}
