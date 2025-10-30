import { useEffect, useState } from "react";

const TRACE_TIMELINE_KEY = "trace-timeline-open";

/**
 * Hook to manage trace timeline overlay state with localStorage persistence
 */
export function useTraceTimeline() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(TRACE_TIMELINE_KEY) === "true";
  });

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(TRACE_TIMELINE_KEY, isOpen.toString());
  }, [isOpen]);

  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return { isOpen, toggle, open, close };
}
