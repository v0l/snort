import { describe, expect, test } from "bun:test"
import { NostrLink, parseNostrLink } from "../src/nostr-link"
import { NostrPrefix } from "@snort/shared"
import type { NostrEvent } from "../src/nostr"
import EventKind from "../src/event-kind"
import { parseZap } from "../src/impl/nip57"

// Shared constants for test events
const TARGET_PUBKEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const REACTOR_PUBKEY = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const TARGET_EVENT_ID = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
const ZAP_SERVICE_PUBKEY = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"

describe("NostrLink", () => {
  describe("d tag handling", () => {
    test("should not decode 'd' tag when it's hex", () => {
      // Create an addressable event with a hex-looking d tag
      const hexDTag = "deadbeef1234567890abcdef"
      const event: NostrEvent = {
        id: "test123",
        kind: 30023, // addressable event kind
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", hexDTag]],
        sig: "test-sig",
      }

      // Create a NostrLink from the event
      const link = NostrLink.fromEvent(event)

      // The id should be the raw hex string, not decoded
      expect(link.id).toBe(hexDTag)
      expect(link.type).toBe(NostrPrefix.Address)
      expect(link.kind).toBe(30023)
      expect(link.author).toBe(event.pubkey)

      // Encode the link to naddr
      const encoded = link.encode()
      expect(encoded.startsWith("naddr")).toBe(true)

      // Parse it back
      const parsed = parseNostrLink(encoded)
      expect(parsed.type).toBe(NostrPrefix.Address)
      expect(parsed.id).toBe(hexDTag) // Should remain as the original string
      expect(parsed.kind).toBe(30023)
      expect(parsed.author).toBe(event.pubkey)
    })

    test("should handle non-hex 'd' tag values correctly", () => {
      const textDTag = "my-article-slug"
      const event: NostrEvent = {
        id: "test456",
        kind: 30023,
        pubkey: "2222222222222222222222222222222222222222222222222222222222222222",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", textDTag]],
        sig: "test-sig",
      }

      const link = NostrLink.fromEvent(event)
      expect(link.id).toBe(textDTag)
      expect(link.type).toBe(NostrPrefix.Address)

      // Round-trip encoding
      const encoded = link.encode()
      const parsed = parseNostrLink(encoded)
      expect(parsed.id).toBe(textDTag)
    })

    test("should handle empty 'd' tag", () => {
      const emptyDTag = ""
      const event: NostrEvent = {
        id: "test789",
        kind: 30023,
        pubkey: "3333333333333333333333333333333333333333333333333333333333333333",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", emptyDTag]],
        sig: "test-sig",
      }

      const link = NostrLink.fromEvent(event)
      expect(link.id).toBe(emptyDTag)

      // Round-trip encoding
      const encoded = link.encode()
      const parsed = parseNostrLink(encoded)
      expect(parsed.id).toBe(emptyDTag)
    })

    test("should handle 'd' tag with special characters", () => {
      const specialDTag = "test:tag/with-special_chars"
      const event: NostrEvent = {
        id: "testabc",
        kind: 30000,
        pubkey: "4444444444444444444444444444444444444444444444444444444444444444",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", specialDTag]],
        sig: "test-sig",
      }

      const link = NostrLink.fromEvent(event)
      expect(link.id).toBe(specialDTag)

      // Round-trip encoding
      const encoded = link.encode()
      const parsed = parseNostrLink(encoded)
      expect(parsed.id).toBe(specialDTag)
    })
  })

  describe("tagKey", () => {
    test("should create correct tagKey for address link", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "my-article",
        30023,
        "1111111111111111111111111111111111111111111111111111111111111111",
      )

      expect(link.tagKey).toBe("30023:1111111111111111111111111111111111111111111111111111111111111111:my-article")
    })

    test("should create correct tagKey for event link", () => {
      const eventId = "abc123def456abc123def456abc123def456abc123def456abc123def456abc1"
      const link = new NostrLink(NostrPrefix.Event, eventId)

      expect(link.tagKey).toBe(eventId)
    })
  })

  describe("matchesEvent", () => {
    test("should match addressable event with correct d tag", () => {
      const dTag = "my-article"
      const pubkey = "1111111111111111111111111111111111111111111111111111111111111111"
      const kind = 30023

      const link = new NostrLink(NostrPrefix.Address, dTag, kind, pubkey)

      const event: NostrEvent = {
        id: "test",
        kind,
        pubkey,
        created_at: 1234567890,
        content: "test",
        tags: [["d", dTag]],
        sig: "test-sig",
      }

      expect(link.matchesEvent(event)).toBe(true)
    })

    test("should not match addressable event with different d tag", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "article-1",
        30023,
        "1111111111111111111111111111111111111111111111111111111111111111",
      )

      const event: NostrEvent = {
        id: "test",
        kind: 30023,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [["d", "article-2"]], // different d tag
        sig: "test-sig",
      }

      expect(link.matchesEvent(event)).toBe(false)
    })
  })

  describe("fromTag", () => {
    test("should parse 'a' tag correctly", () => {
      const dTag = "my-article"
      const kind = "30023"
      const author = "1111111111111111111111111111111111111111111111111111111111111111"
      const relay = "wss://relay.example.com"

      const tag = ["a", `${kind}:${author}:${dTag}`, relay]
      const link = NostrLink.fromTag(tag)

      expect(link?.type).toBe(NostrPrefix.Address)
      expect(link?.id).toBe(dTag)
      expect(link?.kind).toBe(Number(kind))
      expect(link?.author).toBe(author)
      expect(link?.relays).toEqual([relay])
    })

    test("should parse 'a' tag with hex-like d tag", () => {
      const hexDTag = "deadbeef"
      const kind = "30023"
      const author = "2222222222222222222222222222222222222222222222222222222222222222"

      const tag = ["a", `${kind}:${author}:${hexDTag}`]
      const link = NostrLink.fromTag(tag)

      expect(link?.type).toBe(NostrPrefix.Address)
      expect(link?.id).toBe(hexDTag) // Should remain as string, not decoded
      expect(link?.kind).toBe(Number(kind))
      expect(link?.author).toBe(author)
    })
    })
  })

  describe("isReplyToThis", () => {
    test("returns false for the event itself (cant match self)", () => {
      const link = NostrLink.fromEvent({
        id: TARGET_EVENT_ID,
        kind: 1,
        pubkey: TARGET_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [],
        sig: "fakesig",
      })
      const ev: NostrEvent = {
        id: TARGET_EVENT_ID,
        kind: 1,
        pubkey: TARGET_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
    })

    test("returns false for event with no e/a tags", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "unrelated1",
        kind: 1,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "no tags",
        tags: [],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
    })

    // --- Kind 1: Text Note (reply) ---

    test("kind 1 reply with marked e tag matches", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "reply1",
        kind: EventKind.TextNote,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "reply",
        tags: [["e", TARGET_EVENT_ID, "", "reply"]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 1 reply with root marker matches", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "reply2",
        kind: EventKind.TextNote,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "reply to root",
        tags: [["e", TARGET_EVENT_ID, "", "root"]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 1 reply with unmarked e tag matches (positional)", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "reply3",
        kind: EventKind.TextNote,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "reply positional",
        tags: [["e", TARGET_EVENT_ID]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 1 reply to address link with a tag matches", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-article", 30023, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "reply4",
        kind: EventKind.TextNote,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "reply to article",
        tags: [["a", `30023:${TARGET_PUBKEY}:my-article`, "", "root"]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    // --- Kind 5: Deletion ---

    test("kind 5 deletion with e tag matches", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "del1",
        kind: EventKind.Deletion,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [["e", TARGET_EVENT_ID]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 5 deletion with a tag matches address link", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-article", 30023, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "del2",
        kind: EventKind.Deletion,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [["a", `30023:${TARGET_PUBKEY}:my-article`]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    // --- Kind 6: Repost ---

    test("kind 6 repost with e tag matches event link", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "repost1",
        kind: EventKind.Repost,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [["e", TARGET_EVENT_ID]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 6 repost with a tag matches address link", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "repost2",
        kind: EventKind.Repost,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [["a", `34235:${TARGET_PUBKEY}:my-video`]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    // --- Kind 7: Reaction ---

    test("kind 7 reaction with e tag matches event link", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "reaction1",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "+",
        tags: [["e", TARGET_EVENT_ID]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 7 reaction with a tag matches address link", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "reaction2",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "🔥",
        tags: [["a", `34235:${TARGET_PUBKEY}:my-video`]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    // --- Kind 9735: Zap Receipt ---

    test("kind 9735 zap receipt with e tag on receipt matches event link", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["e", TARGET_EVENT_ID],
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["e", TARGET_EVENT_ID], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq1", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 9735 zap receipt with a tag on receipt matches address link", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "zap2",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["a", `34235:${TARGET_PUBKEY}:my-video`],
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", "{}"],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("kind 9735 zap receipt with NO e/a tag on receipt does NOT match via isReplyToThis", () => {
      // This is the core bug: zap receipts may reference the target only
      // in the inner zap request (description tag), not on the receipt's own tags.
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap3",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["e", TARGET_EVENT_ID], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq3", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      // isReplyToThis returns false because there are no e/a tags on the receipt itself
      expect(link.isReplyToThis(ev)).toBe(false)
    })

    test("kind 9735 zap receipt targeting address link with NO a tag on receipt does NOT match via isReplyToThis", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "zap4",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["a", `34235:${TARGET_PUBKEY}:my-video`], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq4", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
    })

    // --- Unrelated events ---

    test("returns false for event referencing different event id", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "unrelated2",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "+",
        tags: [["e", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
    })

    test("returns false for event referencing different address", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-article", 30023, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "unrelated3",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "+",
        tags: [["a", `30023:${TARGET_PUBKEY}:different-article`]],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
    })
  })

  describe("referencesThis", () => {
    test("returns true when e tag matches event link", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "ev1",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "+",
        tags: [["e", TARGET_EVENT_ID]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(true)
    })

    test("returns true when a tag matches address link", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-article", 30023, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "ev2",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "+",
        tags: [["a", `30023:${TARGET_PUBKEY}:my-article`]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(true)
    })

    test("returns true when p tag matches profile link", () => {
      const link = NostrLink.profile(TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "ev3",
        kind: 1,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "hello",
        tags: [["p", TARGET_PUBKEY]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(true)
    })

    test("returns true when p tag matches publicKey link", () => {
      const link = NostrLink.publicKey(TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "ev4",
        kind: 1,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "hello",
        tags: [["p", TARGET_PUBKEY]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(true)
    })

    test("returns false when no tags match", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "ev5",
        kind: 1,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "no matching tags",
        tags: [["p", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(false)
    })

    test("returns false when e tag has different id", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "ev6",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "+",
        tags: [["e", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(false)
    })

    test("returns false when a tag has different address", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-article", 30023, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "ev7",
        kind: EventKind.Reaction,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "+",
        tags: [["a", `30023:${TARGET_PUBKEY}:other-article`]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(false)
    })

    test("returns false for address link when event has only e tag (wrong type)", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-article", 30023, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "ev8",
        kind: 1,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [["e", TARGET_EVENT_ID]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(false)
    })

    test("returns false for event link when event has only a tag (wrong type)", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "ev9",
        kind: 1,
        pubkey: REACTOR_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [["a", `30023:${TARGET_PUBKEY}:my-article`]],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(false)
    })

    // --- Zap receipt specific referencesThis tests ---

    test("kind 9735 zap receipt: referencesThis finds e tag on receipt", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zapref1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["e", TARGET_EVENT_ID],
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", "{}"],
        ],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(true)
    })

    test("kind 9735 zap receipt: referencesThis does NOT find target in description", () => {
      // referencesThis only checks the event's own tags, not the inner zap request
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zapref2",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["e", TARGET_EVENT_ID], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreqref2", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      // The target is only in the inner zap request, referencesThis can't see it
      expect(link.referencesThis(ev)).toBe(false)
    })
  })

  describe("zap receipt target matching (useEventReactions fix)", () => {
    // These tests verify the combined logic used by useEventReactions to determine
    // if a zap receipt references the target event. The fix adds a fallback that
    // checks parseZap().targetEvents when isReplyToThis and referencesThis both fail.
    //
    // The filtering logic is:
    //   isReplyToThis(v) || (isZapReceipt && (referencesThis(v) || zap.targetEvents.some(t => t.equals(link))))

    // --- isReplyToThis path (works when zap receipt has e/a tags) ---

    test("zap with e tag on receipt matches via isReplyToThis", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap-combo1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["e", TARGET_EVENT_ID],
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["e", TARGET_EVENT_ID], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-c1", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    test("zap with a tag on receipt matches address link via isReplyToThis", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "zap-combo2",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["a", `34235:${TARGET_PUBKEY}:my-video`],
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["a", `34235:${TARGET_PUBKEY}:my-video`], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-c2", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(true)
    })

    // --- referencesThis path (works when zap receipt has e/a tags but isReplyToThis fails) ---

    test("zap with e tag on receipt matches via referencesThis", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap-refs1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["e", TARGET_EVENT_ID],
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", "{}"],
        ],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(true)
    })

    test("zap with a tag on receipt matches address link via referencesThis", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "zap-refs2",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["a", `34235:${TARGET_PUBKEY}:my-video`],
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", "{}"],
        ],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(true)
    })

    // --- targetEvents path (fallback for zap receipts with no e/a tags) ---
    // When the zap receipt has NO e/a tag of its own, isReplyToThis and referencesThis
    // both return false. The fix checks parseZap().targetEvents which extracts targets
    // from the inner zap request.

    test("zap with NO e/a tag on receipt: isReplyToThis returns false", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap-notag1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["e", TARGET_EVENT_ID], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-notag1", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
    })

    test("zap with NO e/a tag on receipt: referencesThis returns false", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap-notag2",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["e", TARGET_EVENT_ID], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-notag2", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.referencesThis(ev)).toBe(false)
    })

    test("parseZap extracts targetEvents from inner zap request e tag", () => {
      const ev: NostrEvent = {
        id: "zap-target1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "zap!", tags: [["e", TARGET_EVENT_ID], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-target1", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      const zap = parseZap(ev)
      const eventLink = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      // Even if zap.valid is false (bolt11 decode may fail), targetEvents should be populated
      // from the inner zap request tags (populated before bolt11 validation)
      expect(zap.targetEvents.some(t => t.equals(eventLink))).toBe(true)
    })

    test("parseZap extracts targetEvents from inner zap request a tag", () => {
      const ev: NostrEvent = {
        id: "zap-target2",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "zap!", tags: [["a", `34235:${TARGET_PUBKEY}:my-video`], ["p", TARGET_PUBKEY]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-target2", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      const zap = parseZap(ev)
      const addrLink = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      expect(zap.targetEvents.some(t => t.equals(addrLink))).toBe(true)
    })

    test("NostrLink.equals correctly matches targetEvent to link", () => {
      // Verify that the equals() method works for the targetEvents comparison
      const eventLink = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const matchingLink = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const differentLink = new NostrLink(NostrPrefix.Event, "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", 1)

      expect(eventLink.equals(matchingLink)).toBe(true)
      expect(eventLink.equals(differentLink)).toBe(false)

      const addrLink = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const matchingAddr = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const differentAddr = new NostrLink(NostrPrefix.Address, "other-video", 34235, TARGET_PUBKEY)

      expect(addrLink.equals(matchingAddr)).toBe(true)
      expect(addrLink.equals(differentAddr)).toBe(false)
    })

    // --- Negative cases ---

    test("zap targeting different event does not match via any path", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap-neg1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["e", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"],
          ["P", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["e", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"], ["p", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-neg1", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
      expect(link.referencesThis(ev)).toBe(false)
      const zap = parseZap(ev)
      expect(zap.targetEvents.some(t => t.equals(link))).toBe(false)
    })

    test("zap targeting different address does not match via any path", () => {
      const link = new NostrLink(NostrPrefix.Address, "my-video", 34235, TARGET_PUBKEY)
      const ev: NostrEvent = {
        id: "zap-neg2",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"],
          ["bolt11", "lnbc100n1..."],
          ["description", JSON.stringify({ kind: 9734, content: "", tags: [["a", `34235:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd:other-video`], ["p", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"]], pubkey: REACTOR_PUBKEY, created_at: 1000, id: "zapreq-neg2", sig: "fakesig" })],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
      expect(link.referencesThis(ev)).toBe(false)
      const zap = parseZap(ev)
      expect(zap.targetEvents.some(t => t.equals(link))).toBe(false)
    })

    test("malformed zap with no description does not crash", () => {
      const link = new NostrLink(NostrPrefix.Event, TARGET_EVENT_ID, 1)
      const ev: NostrEvent = {
        id: "zap-malformed1",
        kind: EventKind.ZapReceipt,
        pubkey: ZAP_SERVICE_PUBKEY,
        created_at: 1000,
        content: "",
        tags: [
          ["P", TARGET_PUBKEY],
        ],
        sig: "fakesig",
      }
      expect(link.isReplyToThis(ev)).toBe(false)
      expect(link.referencesThis(ev)).toBe(false)
      const zap = parseZap(ev)
      expect(zap.targetEvents).toEqual([])
      expect(zap.targetEvents.some(t => t.equals(link))).toBe(false)
    })
  })
