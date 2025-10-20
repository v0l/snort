import classNames from "classnames";
import React, { ForwardedRef } from "react";

import Spinner from "@/Components/Icons/Spinner";
import useLoading from "@/Hooks/useLoading";

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
      className={classNames(
        "light:border light:border-border light:text-neutral-400 light:shadow-sm light:hover:shadow-md",
        props.className,
      )}
      onClick={handle}>
      <span
        className="flex items-center justify-center gap-2 light:text-black"
        style={{ visibility: loading ? "hidden" : "visible" }}>
        {props.children}
      </span>
      {loading && (
        <span className="absolute inset-0">
          <div className="w-full h-full flex items-center justify-center">
            <Spinner />
          </div>
        </span>
      )}
    </button>
  );
});

AsyncButton.displayName = "AsyncButton";

export default AsyncButton;
