import "./AsyncButton.css";
import { useState } from "react";
import Spinner from "../Icons/Spinner";

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  onClick(e: React.MouseEvent): Promise<void> | void;
  children?: React.ReactNode;
}

export default function AsyncButton(props: AsyncButtonProps) {
  const [loading, setLoading] = useState<boolean>(false);

  async function handle(e: React.MouseEvent) {
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
    <button className="spinner-button" type="button" disabled={loading || props.disabled} {...props} onClick={handle}>
      <span style={{ visibility: loading ? "hidden" : "visible" }}>{props.children}</span>
      {loading && (
        <span className="spinner-wrapper">
          <Spinner />
        </span>
      )}
    </button>
  );
}
