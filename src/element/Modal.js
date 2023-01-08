import "./Modal.css";
import { useEffect } from "react"

export default function Modal(props) {
    const onClose = props.onClose || (() => {});

    useEffect(() => {
        document.body.classList.add("scroll-lock");
        return () => document.body.classList.remove("scroll-lock");
    }, []);

    return (
        <div className="modal" onClick={(e) => onClose(e)}>
            {props.children}
        </div>
    )
}