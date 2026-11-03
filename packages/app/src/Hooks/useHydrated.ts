import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
