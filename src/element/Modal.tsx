import "./Modal.css";
import { useEffect } from "react"
import * as React from "react";

export interface ModalProps {
    onClose?: () => void,
    children: React.ReactNode
}

export default function Modal(props: ModalProps) {
    const onClose = props.onClose || (() => { });

    useEffect(() => {
        document.body.classList.add("scroll-lock");
        return () => document.body.classList.remove("scroll-lock");
    }, []);

    return (
        <div className="modal" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            {props.children}
        </div>
    )
}