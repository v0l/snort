import "./AsyncButton.css";
import React, { useState, ForwardedRef } from "react";
import Spinner from "../Icons/Spinner";

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  onClick(e: React.MouseEvent): Promise<void> | void;
  children?: React.ReactNode;
}

const AsyncButton = React.forwardRef<HTMLButtonElement, AsyncButtonProps>((props, ref) => {
  const [loading, setLoading] = useState<boolean>(false);

  async function handle(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading || props.disabled) return;
    setLoading(true);
    try {
      if (typeof props.onClick === "function") {
        const f = props.onClick(e);
        if (f instanceof Promise) {
          await f;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      ref={ref as ForwardedRef<HTMLButtonElement>}
      className="spinner-button"
      type="button"
      disabled={loading || props.disabled}
      {...props}
      onClick={handle}>
      <span style={{ visibility: loading ? "hidden" : "visible" }}>{props.children}</span>
      {loading && (
        <span className="spinner-wrapper">
          <Spinner />
        </span>
      )}
    </button>
  );
});

export default AsyncButton;
