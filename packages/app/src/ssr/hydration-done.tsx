import { useEffect } from "react"

import { finishHydration } from "./client"

export function HydrationDone() {
  useEffect(() => {
    finishHydration()
  }, [])
  return null
}
