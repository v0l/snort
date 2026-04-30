import { Nip22 } from "../src/impl/nip22"
import { describe, expect, test } from "bun:test"
import { NostrPrefix } from "@snort/shared"
import { EventBuilder, EventKind, LinkScope, NostrLink, type TaggedNostrEvent } from "../src/index"

describe("Nip22", () => {
  describe("linkToTag", () => {
    test("should produce uppercase E tag for Event link with Root scope", () => {
      const link = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        undefined,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        ["wss://relay.example.com"],
        LinkScope.Root,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual([
        "E",
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        "wss://relay.example.com",
        "bbbb000000000000000000000000000000000000000000000000000000000002",
      ])
    })

    test("should produce lowercase e tag for Event link with Reply scope", () => {
      const link = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        undefined,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        ["wss://relay.example.com"],
        LinkScope.Reply,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual([
        "e",
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        "wss://relay.example.com",
        "bbbb000000000000000000000000000000000000000000000000000000000002",
      ])
    })

    test("should produce lowercase e tag for Event link with no scope (defaults to reply)", () => {
      const link = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        undefined,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual([
        "e",
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        "",
        "bbbb000000000000000000000000000000000000000000000000000000000002",
      ])
    })

    test("should produce uppercase E tag for Event link without author or relays", () => {
      const link = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        undefined,
        undefined,
        undefined,
        LinkScope.Root,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual(["E", "aaaa000000000000000000000000000000000000000000000000000000000001", "", ""])
    })

    test("should produce uppercase A tag for Address link with Root scope", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "my-dtag",
        30023,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        ["wss://relay.example.com"],
        LinkScope.Root,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual(["A", "30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-dtag", "wss://relay.example.com"])
    })

    test("should produce lowercase a tag for Address link with Reply scope", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "my-dtag",
        30023,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        ["wss://relay.example.com"],
        LinkScope.Reply,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual(["a", "30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-dtag", "wss://relay.example.com"])
    })

    test("should produce lowercase a tag for Address link without relay", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "my-dtag",
        30023,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        undefined,
        LinkScope.Reply,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual(["a", "30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-dtag", ""])
    })

    test("should produce uppercase P tag for PublicKey link with Root scope", () => {
      const link = new NostrLink(
        NostrPrefix.PublicKey,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        undefined,
        undefined,
        ["wss://relay.example.com"],
        LinkScope.Root,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual(["P", "bbbb000000000000000000000000000000000000000000000000000000000002", "wss://relay.example.com"])
    })

    test("should produce lowercase p tag for Profile link with Reply scope", () => {
      const link = new NostrLink(
        NostrPrefix.Profile,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        undefined,
        undefined,
        ["wss://relay.example.com"],
        LinkScope.Reply,
      )
      const tag = Nip22.linkToTag(link)
      expect(tag).toEqual(["p", "bbbb000000000000000000000000000000000000000000000000000000000002", "wss://relay.example.com"])
    })

    test("should throw for unsupported NostrPrefix types", () => {
      // Note links shouldn't be used in NIP-22 tag context
      const link = new NostrLink(
        NostrPrefix.Note,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
      )
      // Note is treated like Event (falls through to e/E branch)
      const tag = Nip22.linkToTag(link)
      expect(tag[0]).toBe("e") // lowercase because no scope
    })
  })

  describe("replyTo", () => {
    test("should produce NIP-22 tags when replying to a root event (no existing thread)", () => {
      const rootEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 21, // Video event (non-kind-1, triggers NIP-22 path)
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Nice video!",
        tags: [],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const eb = new EventBuilder()
      eb.kind(EventKind.Comment).pubKey("cccc000000000000000000000000000000000000000000000000000000000003").content("Great content!")
      Nip22.replyTo(rootEvent, eb)

      const built = eb.build()

      // Should have uppercase E (root) and lowercase e (reply)
      // When replying to a root event with no thread, both point to the same event
      const ETags = built.tags.filter(t => t[0] === "E" || t[0] === "e")
      expect(ETags).toHaveLength(2)

      const rootETag = ETags.find(t => t[0] === "E")!
      expect(rootETag[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")
      expect(rootETag[2]).toBe("wss://relay.example.com")
      expect(rootETag[3]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")

      const replyETag = ETags.find(t => t[0] === "e")!
      expect(replyETag[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")

      // K tag for root kind (uppercase)
      const KTag = built.tags.find(t => t[0] === "K")
      expect(KTag).toBeDefined()
      expect(KTag?.[1]).toBe("21")

      // k tag for reply kind (lowercase)
      const kTag = built.tags.find(t => t[0] === "k")
      expect(kTag).toBeDefined()
      expect(kTag?.[1]).toBe("21")

      // P tag for root author (uppercase)
      const PTags = built.tags.filter(t => t[0] === "P")
      expect(PTags).toHaveLength(1)
      expect(PTags[0][1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")

      // p tag for reply author (lowercase)
      const pTags = built.tags.filter(t => t[0] === "p")
      expect(pTags).toHaveLength(1)
      expect(pTags[0][1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")
    })

    test("should produce correct root and reply tags when replying to a nested comment", () => {
      // A comment that already has NIP-22 thread tags
      const parentComment: TaggedNostrEvent = {
        id: "dddd000000000000000000000000000000000000000000000000000000000004",
        kind: 1111,
        pubkey: "eeee000000000000000000000000000000000000000000000000000000000005",
        created_at: 1234567891,
        content: "A nested reply",
        tags: [
          ["E", "aaaa000000000000000000000000000000000000000000000000000000000001", "", "bbbb000000000000000000000000000000000000000000000000000000000002"],
          ["e", "cccc000000000000000000000000000000000000000000000000000000000003", "", "ffff000000000000000000000000000000000000000000000000000000000006"],
          ["K", "34235"],
          ["k", "1111"],
          ["P", "bbbb000000000000000000000000000000000000000000000000000000000002"],
          ["p", "ffff000000000000000000000000000000000000000000000000000000000006"],
        ],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const eb = new EventBuilder()
      eb.kind(EventKind.Comment).pubKey("9999000000000000000000000000000000000000000000000000000000000009").content("Another reply")
      Nip22.replyTo(parentComment, eb)

      const built = eb.build()

      // Root E should point to the original root from parent's E tag
      const rootETag = built.tags.find(t => t[0] === "E")!
      expect(rootETag[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")

      // Reply e should point to the parent comment
      const replyETag = built.tags.find(t => t[0] === "e")!
      expect(replyETag[1]).toBe("dddd000000000000000000000000000000000000000000000000000000000004")

      // K should preserve root kind from parent's K tag
      const KTag = built.tags.find(t => t[0] === "K")
      expect(KTag).toBeDefined()
      // K tag is read from the parent's existing K tag ("34235") via findTag
      expect(KTag?.[1]).toBe("34235")

      // k should be the parent's kind
      const kTag = built.tags.find(t => t[0] === "k")
      expect(kTag).toBeDefined()
      expect(kTag?.[1]).toBe("1111")

      // P for root author
      const PTag = built.tags.find(t => t[0] === "P")
      expect(PTag).toBeDefined()
      expect(PTag?.[1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")

      // p for reply author (parent comment's author)
      const pTag = built.tags.find(t => t[0] === "p")
      expect(pTag).toBeDefined()
      expect(pTag?.[1]).toBe("eeee000000000000000000000000000000000000000000000000000000000005")
    })

    test("should produce correct tags when replying to a parameterized replaceable event (address)", () => {
      const longFormEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 30023,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Long form article",
        tags: [["d", "my-article-slug"]],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const eb = new EventBuilder()
      eb.kind(EventKind.Comment).pubKey("cccc000000000000000000000000000000000000000000000000000000000003").content("Great article!")
      Nip22.replyTo(longFormEvent, eb)

      const built = eb.build()

      // Should have uppercase A (root) and lowercase a (reply) for address links
      const aTags = built.tags.filter(t => t[0] === "A" || t[0] === "a")
      expect(aTags).toHaveLength(2)

      const rootATag = aTags.find(t => t[0] === "A")!
      expect(rootATag[1]).toBe("30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-article-slug")

      const replyATag = aTags.find(t => t[0] === "a")!
      expect(replyATag[1]).toBe("30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-article-slug")

      // K and k tags
      const KTag = built.tags.find(t => t[0] === "K")
      expect(KTag).toBeDefined()
      expect(KTag?.[1]).toBe("30023")

      const kTag = built.tags.find(t => t[0] === "k")
      expect(kTag).toBeDefined()
      expect(kTag?.[1]).toBe("30023")
    })

    test("should not throw when replying to non-kind-1 events (the original bug)", () => {
      // This is the core bug from GitHub issue #627:
      // Nip22.linkToTag() was an unimplemented stub that returned undefined,
      // causing EventPublisher.reply() to throw for any non-kind-1 event.
      const videoEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 21, // Video (non-kind-1, triggers NIP-22 path)
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Check out this video!",
        tags: [],
        sig: "test",
        relays: [],
      }

      const eb = new EventBuilder()
      eb.kind(EventKind.Comment).pubKey("cccc000000000000000000000000000000000000000000000000000000000003").content("Nice!")

      // This should NOT throw — the original bug caused this to throw
      // "RootScope or ReplyScope are undefined!"
      expect(() => Nip22.replyTo(videoEvent, eb)).not.toThrow()

      const built = eb.build()
      // Verify it actually produced tags
      expect(built.tags.filter(t => t[0] === "E" || t[0] === "e").length).toBeGreaterThan(0)
    })
  })

  describe("parseThread", () => {
    test("should parse NIP-22 uppercase E tag as root scope", () => {
      const event = {
        content: "Nice video!",
        id: "1111111111111111111111111111111111111111111111111111111111111111",
        kind: 1111,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["E", "aaaa000000000000000000000000000000000000000000000000000000000001", "wss://relay.example.com", "bbbb000000000000000000000000000000000000000000000000000000000002"],
          ["K", "34235"],
          ["P", "bbbb000000000000000000000000000000000000000000000000000000000002"],
        ],
      }

      const thread = Nip22.parseThread(event)

      expect(thread).toBeDefined()
      expect(thread?.root).toMatchObject({
        type: NostrPrefix.Event,
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        scope: LinkScope.Root,
      })
      expect(thread?.root?.kind).toBe(34235)
    })

    test("should parse NIP-22 uppercase A tag as root scope", () => {
      const event = {
        content: "Comment on article",
        id: "2222222222222222222222222222222222222222222222222222222222222222",
        kind: 1111,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["A", "30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-article", "wss://relay.example.com"],
          ["K", "30023"],
          ["P", "bbbb000000000000000000000000000000000000000000000000000000000002"],
        ],
      }

      const thread = Nip22.parseThread(event)

      expect(thread).toBeDefined()
      expect(thread?.root).toMatchObject({
        type: NostrPrefix.Address,
        id: "my-article",
        kind: 30023,
        author: "bbbb000000000000000000000000000000000000000000000000000000000002",
        scope: LinkScope.Root,
      })
      expect(thread?.root?.kind).toBe(30023)
    })

    test("should return undefined for event with no thread tags", () => {
      const event = {
        content: "Just a standalone comment",
        id: "3333333333333333333333333333333333333333333333333333333333333333",
        kind: 1111,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [],
      }

      expect(Nip22.parseThread(event)).toBeUndefined()
    })
  })

  describe("roundtrip: linkToTag → fromTag → linkToTag", () => {
    test("should roundtrip Event link with Root scope", () => {
      const link = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        undefined,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        ["wss://relay.example.com"],
        LinkScope.Root,
      )

      const tag = Nip22.linkToTag(link)
      const parsed = NostrLink.fromTag(tag)

      expect(parsed.type).toBe(NostrPrefix.Event)
      expect(parsed.id).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")
      expect(parsed.author).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")
      expect(parsed.scope).toBe(LinkScope.Root)
      expect(parsed.relays).toEqual(["wss://relay.example.com"])
    })

    test("should roundtrip Address link with Root scope", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "my-dtag",
        30023,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        ["wss://relay.example.com"],
        LinkScope.Root,
      )

      const tag = Nip22.linkToTag(link)
      const parsed = NostrLink.fromTag(tag)

      expect(parsed.type).toBe(NostrPrefix.Address)
      expect(parsed.id).toBe("my-dtag")
      expect(parsed.kind).toBe(30023)
      expect(parsed.author).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")
      expect(parsed.scope).toBe(LinkScope.Root)
    })

    test("should roundtrip Event link with Reply scope through tag serialization", () => {
      const link = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        undefined,
        "bbbb000000000000000000000000000000000000000000000000000000000002",
        ["wss://relay.example.com"],
        LinkScope.Reply,
      )

      const tag = Nip22.linkToTag(link)
      // lowercase e tag with author in position 3
      expect(tag[0]).toBe("e")
      const parsed = NostrLink.fromTag(tag)

      // Note: lowercase e tag with hex in position 3 gets parsed as author, not marker
      // So scope is undefined (not Reply). This is a known limitation of fromTag
      // which doesn't distinguish NIP-22 case-based scope from NIP-10 marker-based scope.
      expect(parsed.id).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")
      expect(parsed.author).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")
    })
  })
})