import { useLayoutEffect, useMemo, useRef } from "react"
import { type Location, useLocation, useMatches, useNavigate, useNavigationType, useOutlet } from "react-router-dom"

import { setPaneSource, takePaneSource } from "./PaneContext"
import { canAnchorPanes, nextEntry, type PaneEntry, paneForPath, type PreviousPlace } from "./panes"

const entries = new Map<string, PaneEntry>()

interface Remembered {
  location: Location
  outlet: ReturnType<typeof useOutlet>
}

export function usePaneController() {
  const location = useLocation()
  const action = useNavigationType()
  const matches = useMatches()
  const outlet = useOutlet()
  const navigate = useNavigate()

  const leafId = matches[matches.length - 1]?.id
  const pane = paneForPath(location.pathname, leafId)

  const prev = useRef<PreviousPlace>(undefined)
  const feeds = useRef(new Map<string, Remembered>())

  const entry = useMemo(() => {
    const known = entries.get(location.key)
    if (known) return known
    const made = nextEntry(action, pane, prev.current, takePaneSource())
    if (made) entries.set(location.key, made)
    return made
  }, [location.key])

  if (!entry && !pane) {
    feeds.current.set(location.key, { location, outlet })
  }
  const feed = entry ? feeds.current.get(entry.feed.key) : undefined
  const active = entry && feed ? entry : undefined

  useLayoutEffect(() => {
    prev.current = {
      location: { key: location.key, pathname: location.pathname, search: location.search },
      entry: active,
      anchorable: !active && !pane && canAnchorPanes(location.pathname),
    }
  })

  const closeFrom = (index: number) => {
    if (!active) return
    if (index <= 0) {
      navigate(-active.depth)
      return
    }
    setPaneSource(index - 2)
    navigate(active.panes[index - 1].path)
  }
  const focus = (index: number) => {
    if (!active || index >= active.panes.length - 1) return
    setPaneSource(index - 1)
    navigate(active.panes[index].path)
  }

  return {
    entry: active,
    feedOutlet: active && feed ? feed.outlet : outlet,
    feedLocation: active && feed ? feed.location : undefined,
    closeFrom,
    focus,
    back: () => navigate(-1),
  }
}
