import { useState, useRef, useCallback, useEffect } from "react";

interface HoveringProps {
  enterTimeout?: number;
  leaveTimeout?: number;
}

export default function useHovering<T extends HTMLElement>(props?: HoveringProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const elmRef = useRef<T>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const updatePosition = useCallback(() => {
    if (elmRef.current) {
      const rect = elmRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current || isHovering) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      updatePosition();
      hoverTimeoutRef.current = null;
    }, props?.enterTimeout ?? 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current || !isHovering) return;
    // If there's an enter timeout in progress, cancel it
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
      clearTimeout(hoverTimeoutRef.current!);
      hoverTimeoutRef.current = null;
    }, props?.leaveTimeout ?? 500);
  };

  useEffect(() => {
    if (elmRef.current) {
      elmRef.current.addEventListener("mouseenter", handleMouseEnter);
      elmRef.current.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        elmRef.current?.removeEventListener("mouseenter", handleMouseEnter);
        elmRef.current?.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [elmRef]);

  return { isHovering, elmRef, position };
}
