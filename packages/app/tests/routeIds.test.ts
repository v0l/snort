import { describe, expect, test } from "bun:test"
import { NostrLink } from "@snort/system"

import { createChatLink, ChatType } from "../src/chat"
import { isValidChatId, isValidListFeedId, notFoundUnless } from "../src/Utils/routeIds"

describe("isValidChatId", () => {
  test("accepts missing and real chat ids", () => {
    const pk = "b".repeat(64)
    const id = createChatLink(ChatType.PrivateDirectMessage, pk).replace("/messages/", "")
    expect(isValidChatId(undefined)).toBe(true)
    expect(isValidChatId(id)).toBe(true)
  })

  test("rejects garbage", () => {
    expect(isValidChatId("garbage")).toBe(false)
    expect(isValidChatId("nchat17zzzz")).toBe(false)
  })
})

describe("isValidListFeedId", () => {
  test("accepts a naddr, rejects garbage", () => {
    const naddr = NostrLink.fromEvent({
      id: "a".repeat(64),
      pubkey: "b".repeat(64),
      kind: 30000,
      created_at: 0,
      tags: [["d", "x"]],
      content: "",
      sig: "",
    }).encode()
    expect(isValidListFeedId(naddr)).toBe(true)
    expect(isValidListFeedId("garbage")).toBe(false)
    expect(isValidListFeedId(undefined)).toBe(false)
  })
})

describe("notFoundUnless", () => {
  test("throws a 404 response when invalid", () => {
    let thrown: unknown
    try {
      notFoundUnless(false)
    } catch (e) {
      thrown = e
    }
    expect((thrown as Response).status).toBe(404)
    expect(notFoundUnless(true)).toBeNull()
  })
})
