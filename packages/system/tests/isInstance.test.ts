import { describe, expect, test } from "bun:test"
import {
  NostrLink,
  NostrHashtagLink,
  UnknownTag,
  EventPublisher,
  KeyStorage,
  NotEncrypted,
  InvalidPinError,
  UserState,
  ConnectionCacheRelay,
  RequestFilterBuilder,
} from "../src"
import { NostrPrefix, OfflineError } from "@snort/shared"
import EventKind from "../src/event-kind"

/**
 * Regression tests for the `static isInstance()` pattern.
 *
 * These methods replace `instanceof` checks to avoid class-identity mismatch
 * when a package (e.g. @snort/system) is duplicated in the bundle.
 * See: https://github.com/v0l/snort/issues/626
 */
describe("isInstance", () => {
  describe("NostrLink.isInstance", () => {
    test("returns true for a real NostrLink", () => {
      const link = NostrLink.publicKey("a".repeat(64))
      expect(NostrLink.isInstance(link)).toBe(true)
    })

    test("returns false for a plain object", () => {
      expect(NostrLink.isInstance({})).toBe(false)
    })

    test("returns false for null", () => {
      expect(NostrLink.isInstance(null)).toBe(false)
    })

    test("returns false for a NostrHashtagLink", () => {
      expect(NostrLink.isInstance(new NostrHashtagLink("test"))).toBe(false)
    })

    test("works in RequestFilterBuilder.link() for address type", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-dtag", EventKind.AppData, "a".repeat(64))
      const rb = new RequestFilterBuilder()
      rb.link(link)
      const filter = rb.filter
      expect(filter["#d"]).toEqual(["my-dtag"])
      expect(filter.kinds).toEqual([EventKind.AppData])
      expect(filter.authors).toEqual(["a".repeat(64)])
    })

    test("works in RequestFilterBuilder.link() for event type", () => {
      const link = new NostrLink(NostrPrefix.Event, "b".repeat(64))
      const rb = new RequestFilterBuilder()
      rb.link(link)
      const filter = rb.filter
      expect(filter.ids).toEqual(["b".repeat(64)])
    })
  })

  describe("NostrHashtagLink.isInstance", () => {
    test("returns true for a real NostrHashtagLink", () => {
      expect(NostrHashtagLink.isInstance(new NostrHashtagLink("nostr"))).toBe(true)
    })

    test("returns false for a NostrLink", () => {
      expect(NostrHashtagLink.isInstance(NostrLink.publicKey("a".repeat(64)))).toBe(false)
    })

    test("returns false for an UnknownTag", () => {
      expect(NostrHashtagLink.isInstance(new UnknownTag(["word", "spam"]))).toBe(false)
    })
  })

  describe("UnknownTag.isInstance", () => {
    test("returns true for a real UnknownTag", () => {
      expect(UnknownTag.isInstance(new UnknownTag(["word", "spam"]))).toBe(true)
    })

    test("returns false for a NostrHashtagLink", () => {
      expect(UnknownTag.isInstance(new NostrHashtagLink("test"))).toBe(false)
    })
  })

  describe("EventPublisher.isInstance", () => {
    test("returns true for a real EventPublisher", async () => {
      const pub = EventPublisher.privateKey("a".repeat(64))
      expect(EventPublisher.isInstance(pub)).toBe(true)
    })

    test("returns false for a plain object", () => {
      expect(EventPublisher.isInstance({ signer: {}, pubKey: "" })).toBe(false)
    })
  })

  describe("KeyStorage.isInstance", () => {
    test("returns true for NotEncrypted (extends KeyStorage)", () => {
      expect(KeyStorage.isInstance(new NotEncrypted("a".repeat(64)))).toBe(true)
    })

    test("returns false for a plain object", () => {
      expect(KeyStorage.isInstance({ value: "test" })).toBe(false)
    })
  })

  describe("InvalidPinError.isInstance", () => {
    test("returns true for a real InvalidPinError", () => {
      expect(InvalidPinError.isInstance(new InvalidPinError())).toBe(true)
    })

    test("returns false for a generic Error", () => {
      expect(InvalidPinError.isInstance(new Error("test"))).toBe(false)
    })
  })

  describe("UserState.isInstance", () => {
    test("returns true for a real UserState", () => {
      const state = new UserState("a".repeat(64), {
        initAppdata: { preferences: {} },
        encryptAppdata: false,
        appdataId: "test",
      })
      expect(UserState.isInstance(state)).toBe(true)
    })

    test("returns false for a plain object", () => {
      expect(UserState.isInstance({ pubkey: "test" })).toBe(false)
    })
  })

  describe("ConnectionCacheRelay.isInstance", () => {
    test("returns false for a plain object without connection", () => {
      expect(ConnectionCacheRelay.isInstance({})).toBe(false)
    })

    test("returns false for null", () => {
      expect(ConnectionCacheRelay.isInstance(null)).toBe(false)
    })
  })

  describe("OfflineError.isInstance", () => {
    test("returns true for a real OfflineError", () => {
      expect(OfflineError.isInstance(new OfflineError("test"))).toBe(true)
    })

    test("returns false for a generic Error", () => {
      expect(OfflineError.isInstance(new Error("offline"))).toBe(false)
    })
  })
})
