import { useEffect, useRef, useState } from "react";

function useHistoryState<T>(initialValue: T, key: string) {
  const currentHistoryState = globalThis.history.state ? globalThis.history.state[key] : undefined;
  const myInitialValue = currentHistoryState === undefined ? initialValue : currentHistoryState;
  const [state, setState] = useState(myInitialValue);

  const latestValue = useRef(state);

  const setHistoryState = (value: T) => {
    const newHistoryState = { ...globalThis.history.state, [key]: value };
    globalThis.history.replaceState(newHistoryState, "");
    latestValue.current = value;
  };

  useEffect(() => {
    if (state !== latestValue.current) {
      setHistoryState(state);
      const newHistoryState = { ...globalThis.history.state, [key]: state };
      globalThis.history.replaceState(newHistoryState, "");
      latestValue.current = state;
    }

    // Cleanup logic
    return () => {
      if (state !== latestValue.current) {
        const newHistoryState = { ...globalThis.history.state, [key]: state };
        globalThis.history.replaceState(newHistoryState, ""); // Save the final state
      }
    };
  }, [state, key]);

  const popStateListener = (event: PopStateEvent) => {
    if (event.state && key in event.state) {
      setState(event.state[key]);
    }
  };

  useEffect(() => {
    window.addEventListener("popstate", popStateListener);
    return () => {
      window.removeEventListener("popstate", popStateListener);
    };
  }, []);

  return [state, setState];
}

export default useHistoryState;
