import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType(); // This hook is available in React Router v6

  useEffect(() => {
    if (navigationType !== "POP") {
      window.scrollTo(0, 0);
    }
    // Only scrolls to top on PUSH or REPLACE, not on POP
  }, [pathname, navigationType]);

  return null;
}
