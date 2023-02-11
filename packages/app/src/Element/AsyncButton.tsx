import { useState } from "react";

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick(e: React.MouseEvent): Promise<void> | void;
  children?: React.ReactNode;
}

export default function AsyncButton(props: AsyncButtonProps) {
  const [loading, setLoading] = useState<boolean>(false);

  async function handle(e: React.MouseEvent) {
    if (loading) return;
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
    <button type="button" disabled={loading} {...props} onClick={handle}>
      {props.children}
    </button>
  );
}
