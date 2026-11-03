import { describe, expect, test } from "bun:test"

import {
  continuesRun,
  countUnread,
  matchesQuery,
  previewText,
  sortChats,
  sortMessages,
  splitChats,
  startsNewDay,
} from "../src/Pages/Messages/chatList"

const me = "me"
const chat = (id: string, lastMessage: number, ...ps: Array<string>) => ({
  id,
  lastMessage,
  participants: ps.map(p => ({ id: p })),
})

describe("chat list", () => {
  test("messages you sent do not count as unread", () => {
    const msgs = [
      { from: me, created_at: 200 },
      { from: "bob", created_at: 300 },
      { from: "bob", created_at: 50 },
    ]
    expect(countUnread(msgs, 100, me)).toBe(1)
  })

  test("newest chat first with note to self pinned on top", () => {
    const sorted = sortChats([chat("a", 10, "a"), chat("self", 1, me), chat("b", 20, "b")], me)
    expect(sorted.map(c => c.id)).toEqual(["self", "b", "a"])
  })

  test("equal timestamps give a stable order", () => {
    const sorted = sortChats([chat("a", 5, "a"), chat("b", 5, "b")], me)
    expect(sorted.map(c => c.id)).toEqual(["a", "b"])
  })

  test("splits strangers from people you trust, any trusted member counts", () => {
    const dist = (pk: string) => (pk === "friend" ? 1 : 5)
    const { trusted, other } = splitChats(
      [chat("s", 1, "stranger"), chat("f", 2, "friend"), chat("g", 3, "stranger", "friend"), chat("n", 4, me)],
      me,
      dist,
    )
    expect(trusted.map(c => c.id)).toEqual(["n", "g", "f"])
    expect(other.map(c => c.id)).toEqual(["s"])
  })

  test("chats without participants are dropped", () => {
    expect(splitChats([chat("x", 1)], me, () => 0).trusted).toEqual([])
  })

  test("search is case insensitive and empty matches all", () => {
    expect(matchesQuery(["Alice", undefined], "ali")).toBe(true)
    expect(matchesQuery(["Alice"], "bob")).toBe(false)
    expect(matchesQuery(["Alice"], "  ")).toBe(true)
  })

  test("messages sort oldest first without mutating input", () => {
    const input = [
      { id: "b", created_at: 2 },
      { id: "a", created_at: 1 },
    ]
    expect(sortMessages(input).map(m => m.id)).toEqual(["a", "b"])
    expect(input[0].id).toBe("b")
  })

  test("day separators and runs", () => {
    const day = 86400 * 3
    const msgs = [
      { id: "1", from: "a", created_at: day },
      { id: "2", from: "a", created_at: day + 60 },
      { id: "3", from: "b", created_at: day + 90 },
      { id: "4", from: "b", created_at: day + 90 + 86400 },
    ]
    expect(startsNewDay(msgs, 0)).toBe(true)
    expect(startsNewDay(msgs, 1)).toBe(false)
    expect(startsNewDay(msgs, 3)).toBe(true)
    expect(continuesRun(msgs, 1)).toBe(true)
    expect(continuesRun(msgs, 2)).toBe(false)
    expect(continuesRun(msgs, 3)).toBe(false)
  })

  test("preview flattens whitespace and truncates", () => {
    expect(previewText("a\n\n b")).toBe("a b")
    expect(previewText("x".repeat(100), 10)).toBe(`${"x".repeat(9)}…`)
    expect(previewText(undefined)).toBe("")
  })
})
