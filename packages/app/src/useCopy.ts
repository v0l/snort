import { useState } from "react";

export const useCopy = (timeout = 2000) => {
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(false);
    } catch (error) {
      setError(true);
    }

    setTimeout(() => setCopied(false), timeout);
  };

  return { error, copied, copy };
};
