import { useEffect, useRef, WheelEvent, LegacyRef } from "react";

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
      // @ts-ignore
      el.addEventListener("wheel", onWheel);
      // @ts-ignore
      return () => el.removeEventListener("wheel", onWheel);
    }
  }, []);
  return elRef as LegacyRef<HTMLDivElement> | undefined;
}

export default useHorizontalScroll;
