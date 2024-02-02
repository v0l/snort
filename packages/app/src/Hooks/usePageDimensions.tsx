import { useEffect, useRef, useState } from "react";

export default function usePageDimensions() {
  const ref = useRef<HTMLDivElement | null>(document.querySelector("#root"));
  const [dimensions, setDimensions] = useState({
    width: ref.current?.clientWidth ?? 0,
    height: ref.current?.clientHeight ?? 0,
  });

  useEffect(() => {
    if (ref.current && "ResizeObserver" in window) {
      const observer = new ResizeObserver(entries => {
        if (entries[0].target === ref.current) {
          const { width, height } = entries[0].contentRect;
          setDimensions({ width, height });
        }
      });

      observer.observe(ref.current);

      return () => observer.disconnect();
    }
  }, [ref]);

  return dimensions;
}
