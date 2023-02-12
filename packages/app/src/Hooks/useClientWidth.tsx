import { useRef, useState, useEffect } from "react";

export default function useClientWidth() {
  const ref = useRef<HTMLDivElement | null>(document.querySelector(".page"));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (ref.current) {
        setWidth(ref.current.offsetWidth);
      }
    };

    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, [ref]);

  return width;
}
