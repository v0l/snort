import { describe, expect, test } from "bun:test"
import { EventPublisher, EventKind, type TaggedNostrEvent } from "../src"

const PRIVKEY = "a".repeat(64)

describe("EventPublisher", () => {
  describe("reply", () => {
    test("should use NIP-10 tags when replying to kind 1 (TextNote)", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const textNote: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: EventKind.TextNote,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Hello world!",
        tags: [],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const reply = await publisher.reply(textNote, "Replying to your note")

      // Should be kind 1 (TextNote) when replying to kind 1
      expect(reply.kind).toBe(EventKind.TextNote)

      // NIP-10: lowercase e tags with marker strings
      const eTags = reply.tags.filter(t => t[0] === "e")
      expect(eTags.length).toBeGreaterThanOrEqual(1)

      // Should NOT have uppercase E/A/K/P tags (those are NIP-22)
      expect(reply.tags.some(t => t[0] === "E")).toBe(false)
      expect(reply.tags.some(t => t[0] === "K")).toBe(false)

      // Should have a root marker on the e tag
      const rootTag = eTags.find(t => t[3] === "root")
      expect(rootTag).toBeDefined()
      expect(rootTag?.[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")
    })

    test("should use NIP-22 tags when replying to non-kind-1 events", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const videoEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 21, // Video (non-kind-1)
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Check out this video!",
        tags: [],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const reply = await publisher.reply(videoEvent, "Nice video!")

      // Should be kind 1111 (Comment) when replying to non-kind-1
      expect(reply.kind).toBe(EventKind.Comment)

      // NIP-22: uppercase E for root, lowercase e for reply
      const ETag = reply.tags.find(t => t[0] === "E")
      expect(ETag).toBeDefined()
      expect(ETag?.[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")

      const eTag = reply.tags.find(t => t[0] === "e")
      expect(eTag).toBeDefined()
      expect(eTag?.[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")

      // NIP-22: K tag for root kind
      const KTag = reply.tags.find(t => t[0] === "K")
      expect(KTag).toBeDefined()
      expect(KTag?.[1]).toBe("21")

      // NIP-22: k tag for reply kind
      const kTag = reply.tags.find(t => t[0] === "k")
      expect(kTag).toBeDefined()
      expect(kTag?.[1]).toBe("21")

      // NIP-22: P tag for root author
      const PTag = reply.tags.find(t => t[0] === "P")
      expect(PTag).toBeDefined()
      expect(PTag?.[1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")

      // NIP-22: p tag for reply author
      const pTag = reply.tags.find(t => t[0] === "p")
      expect(pTag).toBeDefined()
      expect(pTag?.[1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")
    })

    test("should use NIP-22 tags when replying to a Comment (kind 1111)", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const commentEvent: TaggedNostrEvent = {
        id: "dddd000000000000000000000000000000000000000000000000000000000004",
        kind: EventKind.Comment,
        pubkey: "eeee000000000000000000000000000000000000000000000000000000000005",
        created_at: 1234567890,
        content: "A comment",
        tags: [],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const reply = await publisher.reply(commentEvent, "Replying to comment")

      // Should be kind 1111 (Comment)
      expect(reply.kind).toBe(EventKind.Comment)

      // NIP-22 tags present
      expect(reply.tags.find(t => t[0] === "E")).toBeDefined()
      expect(reply.tags.find(t => t[0] === "e")).toBeDefined()
      expect(reply.tags.find(t => t[0] === "K")).toBeDefined()
      expect(reply.tags.find(t => t[0] === "k")).toBeDefined()
    })

    test("should not throw when replying to non-kind-1 events (regression #627)", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const videoEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 21,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "A video",
        tags: [],
        sig: "test",
        relays: [],
      }

      // Before fix: threw "RootScope or ReplyScope are undefined!"
      const reply = await publisher.reply(videoEvent, "Nice!")
      expect(reply.kind).toBe(EventKind.Comment)
      expect(reply.tags.length).toBeGreaterThan(0)
    })

    test("should produce correct NIP-22 tags when replying to a threaded comment", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const parentComment: TaggedNostrEvent = {
        id: "dddd000000000000000000000000000000000000000000000000000000000004",
        kind: EventKind.Comment,
        pubkey: "eeee000000000000000000000000000000000000000000000000000000000005",
        created_at: 1234567891,
        content: "A nested reply",
        tags: [
          ["E", "aaaa000000000000000000000000000000000000000000000000000000000001", "", "bbbb000000000000000000000000000000000000000000000000000000000002"],
          ["e", "cccc000000000000000000000000000000000000000000000000000000000003", "", "ffff000000000000000000000000000000000000000000000000000000000006"],
          ["K", "21"],
          ["k", "1111"],
          ["P", "bbbb000000000000000000000000000000000000000000000000000000000002"],
          ["p", "ffff000000000000000000000000000000000000000000000000000000000006"],
        ],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const reply = await publisher.reply(parentComment, "Another reply")

      // Root E tag should point to the original root
      const rootETag = reply.tags.find(t => t[0] === "E")
      expect(rootETag).toBeDefined()
      expect(rootETag?.[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")

      // Reply e tag should point to the parent comment
      const replyETag = reply.tags.find(t => t[0] === "e")
      expect(replyETag).toBeDefined()
      expect(replyETag?.[1]).toBe("dddd000000000000000000000000000000000000000000000000000000000004")

      // K tag should preserve root kind from parent's K tag
      const KTag = reply.tags.find(t => t[0] === "K")
      expect(KTag).toBeDefined()
      expect(KTag?.[1]).toBe("21")
    })

    test("should use NIP-22 tags when replying to a parameterized replaceable event", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const longFormEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 30023, // LongFormTextNote (parameterized replaceable)
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Long form article",
        tags: [["d", "my-article-slug"]],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const reply = await publisher.reply(longFormEvent, "Great article!")

      expect(reply.kind).toBe(EventKind.Comment)

      // NIP-22: A tag for address links
      const ATag = reply.tags.find(t => t[0] === "A")
      expect(ATag).toBeDefined()
      expect(ATag?.[1]).toBe("30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-article-slug")

      const aTag = reply.tags.find(t => t[0] === "a")
      expect(aTag).toBeDefined()
      expect(aTag?.[1]).toBe("30023:bbbb000000000000000000000000000000000000000000000000000000000002:my-article-slug")
    })
  })

  describe("note", () => {
    test("should create a kind 1 text note", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)
      const note = await publisher.note("Hello world!")

      expect(note.kind).toBe(EventKind.TextNote)
      expect(note.content).toBe("Hello world!")
      expect(note.pubkey).toBe(publisher.pubKey)
    })

    test("should create a signed event with valid id", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)
      const note = await publisher.note("Test note")

      expect(note.id).toBeTruthy()
      expect(note.sig).toBeTruthy()
    })
  })

  describe("react", () => {
    test("should create a kind 7 reaction event", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const targetEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: EventKind.TextNote,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Hello!",
        tags: [],
        sig: "test",
        relays: [],
      }

      const reaction = await publisher.react(targetEvent)

      expect(reaction.kind).toBe(EventKind.Reaction)
      expect(reaction.content).toBe("+")

      // Should have e tag pointing to target
      const eTag = reaction.tags.find(t => t[0] === "e")
      expect(eTag).toBeDefined()
      expect(eTag?.[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")

      // Should have p tag for author
      const pTag = reaction.tags.find(t => t[0] === "p")
      expect(pTag).toBeDefined()
      expect(pTag?.[1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")

      // Should have k tag for target kind
      const kTag = reaction.tags.find(t => t[0] === "k")
      expect(kTag).toBeDefined()
      expect(kTag?.[1]).toBe("1")
    })

    test("should create a custom reaction with emoji", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const targetEvent: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: EventKind.TextNote,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Hello!",
        tags: [],
        sig: "test",
        relays: [],
      }

      const reaction = await publisher.react(targetEvent, "🔥")

      expect(reaction.kind).toBe(EventKind.Reaction)
      expect(reaction.content).toBe("🔥")
    })
  })

  describe("delete", () => {
    test("should create a kind 5 deletion event", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)
      const deletion = await publisher.delete("aaaa000000000000000000000000000000000000000000000000000000000001")

      expect(deletion.kind).toBe(EventKind.Deletion)

      const eTag = deletion.tags.find(t => t[0] === "e")
      expect(eTag).toBeDefined()
      expect(eTag?.[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")
    })
  })

  describe("repost", () => {
    test("should create a kind 6 repost event", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)

      const originalNote: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: EventKind.TextNote,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "Original note",
        tags: [],
        sig: "test",
        relays: ["wss://relay.example.com"],
      }

      const repost = await publisher.repost(originalNote)

      expect(repost.kind).toBe(EventKind.Repost)

      // Should have e tag for the reposted note
      const eTag = repost.tags.find(t => t[0] === "e")
      expect(eTag).toBeDefined()
      expect(eTag?.[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001")

      // Should have p tag for the original author
      const pTag = repost.tags.find(t => t[0] === "p")
      expect(pTag).toBeDefined()
      expect(pTag?.[1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002")
    })
  })

  describe("metadata", () => {
    test("should create a kind 0 metadata event", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)
      const metadata = await publisher.metadata({ name: "test", about: "hello" })

      expect(metadata.kind).toBe(EventKind.SetMetadata)
      const parsed = JSON.parse(metadata.content)
      expect(parsed.name).toBe("test")
      expect(parsed.about).toBe("hello")
    })
  })

  describe("generic", () => {
    test("should create a custom event via generic hook", async () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)
      const ev = await publisher.generic(eb => {
        eb.kind(EventKind.TextNote).content("Custom note").tag(["t", "test"])
        return eb
      })

      expect(ev.kind).toBe(EventKind.TextNote)
      expect(ev.content).toBe("Custom note")
      expect(ev.tags.some(t => t[0] === "t" && t[1] === "test")).toBe(true)
    })
  })

  describe("pow", () => {
    test("should create a publisher with PoW target", () => {
      const publisher = EventPublisher.privateKey(PRIVKEY)
      const powPub = publisher.pow(4)
      expect(powPub).toBeDefined()
      expect(powPub.pubKey).toBe(publisher.pubKey)
    })
  })
})