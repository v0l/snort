import { useRef, useState, useEffect } from "react";

export default function useClientWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (ref.current) {
        setWidth(ref.current.clientWidth);
      }
    };

    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, [ref]);

  return {
    ref,
    width,
  };
}
