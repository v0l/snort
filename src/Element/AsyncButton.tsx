import { useState } from "react";

export default function AsyncButton(props: any) {
  const [loading, setLoading] = useState<boolean>(false);

  async function handle(e: any) {
    if (loading) return;
    setLoading(true);
    try {
      if (typeof props.onClick === "function") {
        let f = props.onClick(e);
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
      type="button"
      disabled={loading}
      {...props}
      onClick={(e) => handle(e)}
    >
      {props.children}
    </button>
  );
}
