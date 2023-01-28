import "./Modal.css";
import { useEffect } from "react"
import * as React from "react";

export interface ModalProps {
    className?: string
    onClose?: () => void,
    children: React.ReactNode
}

export default function Modal(props: ModalProps) {
    const onClose = props.onClose || (() => { });
    const className = props.className || ''

    useEffect(() => {
        document.body.classList.add("scroll-lock");
        return () => document.body.classList.remove("scroll-lock");
    }, []);

    return (
        <div className={`modal ${className}`} onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <div className="modal-body">
            {props.children}
          </div>
        </div>
    )
}
