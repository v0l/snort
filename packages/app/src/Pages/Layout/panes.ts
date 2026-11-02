import { NostrPrefix } from "@snort/shared"
import { tryParseNostrLink } from "@snort/system"

export type PaneKind = "note" | "profile" | "notifications"

export interface Pane {
  kind: PaneKind
  path: string
}

export interface FeedAnchor {
  key: string
  pathname: string
  search: string
}

export interface PaneEntry {
  panes: Array<Pane>
  feed: FeedAnchor
  depth: number
}

export interface PaneLocation {
  key: string
  pathname: string
  search: string
}

export interface PreviousPlace {
  location: PaneLocation
  entry?: PaneEntry
  anchorable: boolean
}

export type HistoryAction = "PUSH" | "REPLACE" | "POP"

export const PaneRouteIds = {
  thread: "thread",
  profile: "profile",
  notifications: "notifications",
  link: "nostr-link",
} as const

const NotePrefixes: Array<string> = [NostrPrefix.Event, NostrPrefix.Note, NostrPrefix.Address]

const FullPagePrefixes = ["/messages", "/login", "/new", "/settings", "/wallet", "/subscribe", "/zap-pool", "/deck"]

export function paneForPath(pathname: string, routeId?: string): Pane | undefined {
  switch (routeId) {
    case PaneRouteIds.thread:
      return { kind: "note", path: pathname }
    case PaneRouteIds.profile:
      return { kind: "profile", path: pathname }
    case PaneRouteIds.notifications:
      return { kind: "notifications", path: pathname }
    case PaneRouteIds.link: {
      const link = tryParseNostrLink(pathname.split("/").filter(Boolean)[0] ?? "")
      return { kind: link && NotePrefixes.includes(link.type) ? "note" : "profile", path: pathname }
    }
  }
}

export function canAnchorPanes(pathname: string) {
  return !FullPagePrefixes.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

export function pushPane(stack: Array<Pane>, from: number, pane: Pane): Array<Pane> {
  const base = stack.slice(0, Math.max(0, from + 1))
  const top = base[base.length - 1]
  if (top && top.path === pane.path) return base
  return [...base, pane]
}

export function nextEntry(
  action: HistoryAction,
  pane: Pane | undefined,
  prev: PreviousPlace | undefined,
  source: number,
): PaneEntry | undefined {
  if (!pane || !prev || action === "POP") return
  if (prev.entry) {
    if (action === "REPLACE") {
      return { ...prev.entry, panes: [...prev.entry.panes.slice(0, -1), pane] }
    }
    return { feed: prev.entry.feed, panes: pushPane(prev.entry.panes, source, pane), depth: prev.entry.depth + 1 }
  }
  if (action === "PUSH" && prev.anchorable) {
    const { key, pathname, search } = prev.location
    return { feed: { key, pathname, search }, panes: [pane], depth: 1 }
  }
}

export function visiblePanes(count: number, width: number, paneMin: number, spine: number): number {
  let open = count
  while (open > 1 && open * paneMin + (count - open) * spine > width) open--
  return open
}
