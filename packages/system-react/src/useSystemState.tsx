import { useSyncExternalStore } from "react"
import type { SystemSnapshot } from "@snort/system"
import type { ExternalStore } from "@snort/shared"

const emptySnapshot: SystemSnapshot = {
  queries: [],
}

export function useSystemState(system: ExternalStore<SystemSnapshot>) {
  return useSyncExternalStore<SystemSnapshot>(
    cb => system.hook(cb),
    () => system.snapshot(),
    () => emptySnapshot,
  )
}
