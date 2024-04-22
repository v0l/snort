import { useEffect } from "react";

import usePreferences from "./usePreferences";

export function useTheme() {
  const theme = usePreferences(s => s.theme);

  function setTheme(theme: "light" | "dark") {
    const elm = document.documentElement;
    if (theme === "light" && !elm.classList.contains("light")) {
      elm.classList.add("light");
    } else if (theme === "dark" && elm.classList.contains("light")) {
      elm.classList.remove("light");
    }
  }

  useEffect(() => {
    const osTheme = window.matchMedia("(prefers-color-scheme: light)");
    setTheme(theme === "system" && osTheme.matches ? "light" : theme === "light" ? "light" : "dark");

    osTheme.onchange = e => {
      if (theme === "system") {
        setTheme(e.matches ? "light" : "dark");
      }
    };
    return () => {
      osTheme.onchange = null;
    };
  }, [theme]);
}
