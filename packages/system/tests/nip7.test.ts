import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Nip7Signer } from "../src/impl/nip7"
import { EventExt } from "../src/event-ext"
import { PrivateKeySigner } from "../src/signer"
import type { NostrEvent } from "../src/nostr"

/**
 * Helpers to mock window.nostr for NIP-07 testing
 *
 * Bun test runner doesn't have a DOM, so we must create globalThis.window
 * and the nostr property ourselves.
 */
function setupWindowNostr(signEventFn: (ev: NostrEvent) => Promise<NostrEvent>) {
  if (!globalThis.window) {
    // @ts-expect-error Bun test has no DOM
    globalThis.window = {}
  }
  globalThis.window.nostr = {
    getPublicKey: async () => "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
    signEvent: signEventFn,
  }
}

function clearWindowNostr() {
  if (globalThis.window) {
    // @ts-expect-error cleaning up mock
    globalThis.window.nostr = undefined
  }
}

describe("Nip7Signer", () => {
  afterEach(() => {
    clearWindowNostr()
  })

  describe("sign", () => {
    test("should use signer-returned id and sig when extension computes different id", async () => {
      // Simulate a NIP-07 extension (like nos2x) that computes its own event id.
      // This happens when the extension serializes the event differently than snort
      // (e.g. different tag ordering, no client tag, etc.)
      const pk = PrivateKeySigner.random()
      const pubKey = await pk.getPubKey()

      // Build an event the way EventBuilder does — snort pre-computes the id
      // from sorted tags
      const ev: NostrEvent = {
        id: "",
        pubkey: pubKey,
        kind: 27235,
        tags: [
          ["method", "GET"],
          ["u", "https://example.com/api"],
        ],
        content: "",
        created_at: 1777538448,
        sig: "",
      }
      ev.id = EventExt.createId(ev)

      // The extension recomputes id using its own canonicalization (e.g. unsorted tags).
      // Build the "extension's version" with unsorted tags:
      const extensionEv: NostrEvent = {
        id: "",
        pubkey: pubKey,
        kind: 27235,
        tags: [
          ["u", "https://example.com/api"],
          ["method", "GET"],
        ],
        content: "",
        created_at: 1777538448,
        sig: "",
      }
      const extensionSigned = await pk.sign(extensionEv)

      // Verify the extension would produce a different id due to tag order
      expect(extensionSigned.id).not.toBe(ev.id)

      // Mock window.nostr to return the extension-signed event
      setupWindowNostr(async () => extensionSigned)

      const signer = new Nip7Signer()
      const result = await signer.sign(ev)

      // The returned event must use the signer's id and sig (they are a pair)
      expect(result.id).toBe(extensionSigned.id)
      expect(result.sig).toBe(extensionSigned.sig)

      // The core event data must be preserved
      expect(result.kind).toBe(ev.kind)
      expect(result.content).toBe(ev.content)
      expect(result.tags).toBe(ev.tags)
      expect(result.created_at).toBe(ev.created_at)
      expect(result.pubkey).toBe(ev.pubkey)
    })

    test("should return valid id/sig pair when ids happen to match", async () => {
      const pk = PrivateKeySigner.random()
      const pubKey = await pk.getPubKey()

      const ev: NostrEvent = {
        id: "",
        pubkey: pubKey,
        kind: 1,
        tags: [],
        content: "hello",
        created_at: 1234567890,
        sig: "",
      }
      ev.id = EventExt.createId(ev)

      // Extension signs and returns matching id (same canonical form)
      const extensionSigned = await pk.sign({ ...ev, id: "" })

      setupWindowNostr(async () => extensionSigned)

      const signer = new Nip7Signer()
      const result = await signer.sign(ev)

      expect(result.id).toBe(extensionSigned.id)
      expect(result.sig).toBe(extensionSigned.sig)
      expect(EventExt.verify(result)).toBe(true)
    })

    test("should throw when window.nostr is not available", async () => {
      // Ensure no nostr extension
      clearWindowNostr()

      const signer = new Nip7Signer()
      const ev: NostrEvent = {
        id: "test",
        pubkey: "test",
        kind: 1,
        tags: [],
        content: "",
        created_at: 0,
        sig: "",
      }

      await expect(signer.sign(ev)).rejects.toThrow("Cannot use NIP-07 signer, not found!")
    })
  })

  describe("getPubKey", () => {
    test("should return public key from extension", async () => {
      setupWindowNostr(async () => ({}) as NostrEvent)

      const signer = new Nip7Signer()
      const pubKey = await signer.getPubKey()

      expect(pubKey).toBe("63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed")
    })

    test("should throw when window.nostr is not available", async () => {
      clearWindowNostr()

      const signer = new Nip7Signer()
      await expect(signer.getPubKey()).rejects.toThrow("Cannot use NIP-07 signer, not found!")
    })
  })
})
