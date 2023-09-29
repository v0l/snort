import { useState } from "react";

export const useCopy = (timeout = 2000) => {
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    setError(false);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        await document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
    } catch (error) {
      setError(true);
    }

    setTimeout(() => setCopied(false), timeout);
  };

  return { error, copied, copy };
};
