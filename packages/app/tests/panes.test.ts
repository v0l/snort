import { describe, expect, test } from "bun:test"
import { NostrLink } from "@snort/system"

import {
  canAnchorPanes,
  nextEntry,
  type Pane,
  type PaneEntry,
  PaneRouteIds,
  paneForPath,
  pushPane,
  visiblePanes,
} from "../src/Pages/Layout/panes"

const nevent = NostrLink.fromEvent({
  id: "a".repeat(64),
  pubkey: "b".repeat(64),
  kind: 1,
  created_at: 0,
  tags: [],
  content: "",
  sig: "",
}).encode()

const a: Pane = { kind: "note", path: "/a" }
const b: Pane = { kind: "profile", path: "/b" }
const c: Pane = { kind: "note", path: "/c" }
const feed = { key: "k0", pathname: "/following", search: "" }

describe("paneForPath", () => {
  test("thread, profile and notification routes open as panes", () => {
    expect(paneForPath("/e/x", PaneRouteIds.thread)?.kind).toBe("note")
    expect(paneForPath("/p/x", PaneRouteIds.profile)?.kind).toBe("profile")
    expect(paneForPath("/notifications", PaneRouteIds.notifications)?.kind).toBe("notifications")
  })

  test("bare nostr links pick note or profile from the link", () => {
    expect(paneForPath(`/${nevent}`, PaneRouteIds.link)?.kind).toBe("note")
    expect(paneForPath("/kieran", PaneRouteIds.link)?.kind).toBe("profile")
  })

  test("any other route is a full page", () => {
    expect(paneForPath("/following", "root-following")).toBeUndefined()
    expect(paneForPath("/settings", undefined)).toBeUndefined()
  })
})

describe("canAnchorPanes", () => {
  test("feeds can hold panes", () => {
    expect(canAnchorPanes("/following")).toBe(true)
    expect(canAnchorPanes("/t/bitcoin")).toBe(true)
  })

  test("full-page screens do not", () => {
    expect(canAnchorPanes("/messages/abc")).toBe(false)
    expect(canAnchorPanes("/settings/relays")).toBe(false)
  })
})

describe("pushPane", () => {
  test("opening from the feed starts a new stack", () => {
    expect(pushPane([a, b], -1, c)).toEqual([c])
  })

  test("opening from a pane drops everything to its right", () => {
    expect(pushPane([a, b, c], 0, c)).toEqual([a, c])
  })

  test("opening the pane already on top does nothing", () => {
    expect(pushPane([a, b], 1, b)).toEqual([a, b])
  })
})

describe("nextEntry", () => {
  const onFeed = { location: { ...feed }, anchorable: true }

  test("opening a note from the feed anchors the feed and opens one pane", () => {
    expect(nextEntry("PUSH", a, onFeed, -1)).toEqual({ feed, panes: [a], depth: 1 })
  })

  test("opening from inside a pane keeps the same feed and stacks", () => {
    const entry: PaneEntry = { feed, panes: [a], depth: 1 }
    expect(
      nextEntry("PUSH", b, { location: { key: "k1", pathname: "/a", search: "" }, entry, anchorable: true }, 0),
    ).toEqual({
      feed,
      panes: [a, b],
      depth: 2,
    })
  })

  test("a redirect inside a pane replaces the top pane", () => {
    const entry: PaneEntry = { feed, panes: [a, b], depth: 2 }
    expect(
      nextEntry("REPLACE", c, { location: { key: "k2", pathname: "/b", search: "" }, entry, anchorable: true }, 1),
    ).toEqual({
      feed,
      panes: [a, c],
      depth: 2,
    })
  })

  test("a fresh load of a note link is a full page", () => {
    expect(nextEntry("POP", a, onFeed, -1)).toBeUndefined()
    expect(nextEntry("PUSH", a, undefined, -1)).toBeUndefined()
  })

  test("opening from a full-page screen stays a full page", () => {
    expect(
      nextEntry("PUSH", a, { location: { key: "m", pathname: "/messages", search: "" }, anchorable: false }, -1),
    ).toBeUndefined()
  })

  test("feed routes never become panes", () => {
    expect(nextEntry("PUSH", undefined, onFeed, -1)).toBeUndefined()
  })
})

describe("visiblePanes", () => {
  test("all panes open when they fit", () => {
    expect(visiblePanes(2, 1000, 440, 46)).toBe(2)
  })

  test("older panes fold into spines when space runs out", () => {
    expect(visiblePanes(3, 700, 440, 46)).toBe(1)
    expect(visiblePanes(3, 980, 440, 46)).toBe(2)
  })

  test("the top pane always stays open", () => {
    expect(visiblePanes(4, 100, 440, 46)).toBe(1)
  })
})
