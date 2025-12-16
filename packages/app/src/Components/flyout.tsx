import classNames from "classnames";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

import IconButton from "@/Components/Button/IconButton";

export default function Flyout({
  show,
  children,
  title,
  actions,
  onClose,
  side,
  width,
}: {
  show: boolean;
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  side: "left" | "right";
  width?: string;
}) {
  const styles = {
    "--flyout-w": width ?? "400px",
    transition: "all 0.2s ease-in-out",
    width: "var(--flyout-w)",
    transform:
      side === "right"
        ? `translate(${show ? "0" : "var(--flyout-w)"},0)`
        : `translate(${show ? "0" : "calc(-1 * var(--flyout-w))"},0)`,
  } as CSSProperties;

  return createPortal(
    <div
      className={classNames("absolute top-0 overflow-hidden z-50", {
        "pointer-events-none": !show,
        "right-0": side == "right",
        "left-0": side === "left",
      })}>
      <div className="layer-1 h-[100vh] top-0 overflow-hidden" style={styles}>
        <div className="flex justify-between items-center">
          {title}
          <div className="flex gap-2 items-center">
            {actions}
            <IconButton icon={{ name: "x" }} onClick={onClose} />
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  ) as React.ReactNode;
}
