import { useState } from "react";

export default function useTimelineWindow(opt: { window?: number; now: number }) {
  const [window] = useState(opt.window ?? 60 * 60 * 2);
  const [until, setUntil] = useState(opt.now);
  const [since, setSince] = useState(opt.now - window);

  return {
    now: opt.now,
    since,
    until,
    setUntil,
    older: () => {
      setUntil(s => s - window);
      setSince(s => s - window);
    },
  };
}
