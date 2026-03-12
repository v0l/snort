import { useCallback, useEffect, useRef, useState } from "react"

function useHistoryState<T>(initialValue: T, key: string) {
  const currentHistoryState = globalThis.history.state ? globalThis.history.state[key] : undefined
  const myInitialValue = currentHistoryState === undefined ? initialValue : currentHistoryState
  const [state, setState] = useState(myInitialValue)

  const latestValue = useRef(state)

  const setHistoryState = useCallback((value: T) => {
    const newHistoryState = { ...globalThis.history.state, [keyRef.current]: value }
    globalThis.history.replaceState(newHistoryState, "")
    latestValue.current = value
  }, [])

  useEffect(() => {
    if (state !== latestValue.current) {
      setHistoryState(state)
      const newHistoryState = { ...globalThis.history.state, [key]: state }
      globalThis.history.replaceState(newHistoryState, "")
      latestValue.current = state
    }

    // Cleanup logic
    return () => {
      if (state !== latestValue.current) {
        const newHistoryState = { ...globalThis.history.state, [key]: state }
        globalThis.history.replaceState(newHistoryState, "") // Save the final state
      }
    }
  }, [state, key, setHistoryState])

  const keyRef = useRef(key)
  useEffect(() => {
    keyRef.current = key
  })

  useEffect(() => {
    const handler = (event: PopStateEvent) => {
      if (event.state && keyRef.current in event.state) {
        setState(event.state[keyRef.current])
      }
    }
    window.addEventListener("popstate", handler)
    return () => {
      window.removeEventListener("popstate", handler)
    }
  }, [])

  return [state, setState]
}

export default useHistoryState
