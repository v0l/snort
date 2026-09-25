import { NostrPrefix } from "@snort/shared"
import { EventKind, NostrLink } from "../src"
import { RequestBuilder } from "../src/request-builder"
import { describe, expect, test } from "bun:test"

describe("RequestBuilder", () => {
  describe("basic", () => {
    test("empty filter", () => {
      const b = new RequestBuilder("test")
      b.withFilter()
      expect(b.buildRaw()).toEqual([{}])
    })
    test("only kind", () => {
      const b = new RequestBuilder("test")
      b.withFilter().kinds([0])
      expect(b.buildRaw()).toMatchObject([{ kinds: [0] }])
    })
    test("empty authors", () => {
      const b = new RequestBuilder("test")
      b.withFilter().authors([])
      expect(b.buildRaw()).toMatchObject([{ authors: [] }])
    })
    test("search", () => {
      const b = new RequestBuilder("test")
      b.withFilter().kinds([1]).search("test-search")
      expect(b.buildRaw()).toMatchObject([{ kinds: [1], search: "test-search" }])
    })
  })

  test("profile link queries by author and kind, not by id", () => {
    const pubkey = "a".repeat(64)
    const rb = new RequestBuilder("profile")
    rb.withFilter().link(new NostrLink(NostrPrefix.Event, pubkey, EventKind.SetMetadata, pubkey))
    expect(rb.buildRaw()).toEqual([{ authors: [pubkey], kinds: [EventKind.SetMetadata] }])
  })
})
