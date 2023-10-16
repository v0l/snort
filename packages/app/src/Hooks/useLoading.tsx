import { useState } from "react";

export default function useLoading<T>(fn: ((e: React.MouseEvent) => Promise<T> | T) | undefined, disabled?: boolean) {
  const [loading, setLoading] = useState<boolean>(false);

  async function handle(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading || disabled) return;
    setLoading(true);
    try {
      if (typeof fn === "function") {
        await fn(e);
      }
    } finally {
      setLoading(false);
    }
  }

  return { handle, loading };
}
