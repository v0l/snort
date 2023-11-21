import "./AsyncButton.css";
import React, { ForwardedRef } from "react";
import Spinner from "../Icons/Spinner";
import useLoading from "@/Hooks/useLoading";
import classNames from "classnames";

export interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (e: React.MouseEvent) => Promise<void> | void;
}

const AsyncButton = React.forwardRef<HTMLButtonElement, AsyncButtonProps>((props, ref) => {
  const { handle, loading } = useLoading(props.onClick, props.disabled);

  return (
    <button
      ref={ref as ForwardedRef<HTMLButtonElement>}
      type="button"
      disabled={loading || props.disabled}
      {...props}
      className={classNames("spinner-button", props.className)}
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
