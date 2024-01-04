import { LegacyRef,useEffect, useRef } from "react";

function useHorizontalScroll() {
  const elRef = useRef<HTMLDivElement>();
  useEffect(() => {
    const el = elRef.current;
    if (el) {
      const onWheel = (ev: WheelEvent) => {
        if (ev.deltaY == 0) return;
        ev.preventDefault();
        el.scrollTo({ left: el.scrollLeft + ev.deltaY, behavior: "smooth" });
      };
      el.addEventListener("wheel", onWheel);
      return () => el.removeEventListener("wheel", onWheel);
    }
  }, []);
  return elRef as LegacyRef<HTMLDivElement> | undefined;
}

export default useHorizontalScroll;
