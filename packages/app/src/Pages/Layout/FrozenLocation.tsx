import { type ReactNode, use, useMemo } from "react"
import { type Location, UNSAFE_LocationContext } from "react-router-dom"

export function FrozenLocation({ location, children }: { location?: Location; children: ReactNode }) {
  const live = use(UNSAFE_LocationContext)
  const value = useMemo(() => (location ? { location, navigationType: live.navigationType } : live), [location, live])
  return <UNSAFE_LocationContext.Provider value={value}>{children}</UNSAFE_LocationContext.Provider>
}
