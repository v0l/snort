import { useEffect, useRef, useState } from "react";

function useHistoryState(initialValue, key) {
  const currentHistoryState = history.state ? history.state[key] : undefined;
  const myInitialValue = currentHistoryState === undefined ? initialValue : currentHistoryState;
  const [state, setState] = useState(myInitialValue);

  const latestValue = useRef(state);

  const setHistoryState = value => {
    const newHistoryState = { ...history.state, [key]: value };
    history.replaceState(newHistoryState, "");
    latestValue.current = value;
  };

  useEffect(() => {
    if (state !== latestValue.current) {
      setHistoryState(state);
      const newHistoryState = { ...history.state, [key]: state };
      history.replaceState(newHistoryState, "");
      latestValue.current = state;
    }

    // Cleanup logic
    return () => {
      if (state !== latestValue.current) {
        const newHistoryState = { ...history.state, [key]: state };
        history.replaceState(newHistoryState, ""); // Save the final state
      }
    };
  }, [state, key]);

  const popStateListener = event => {
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
