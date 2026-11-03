import { useSyncExternalStore } from "react"

export const ServerWindowSize = { width: 1280, height: 800 }

let current = ServerWindowSize

function read() {
  if (current.width !== window.innerWidth || current.height !== window.innerHeight) {
    current = { width: window.innerWidth, height: window.innerHeight }
  }
  return current
}

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}

export default function useWindowSize() {
  return useSyncExternalStore(subscribe, read, () => ServerWindowSize)
}
