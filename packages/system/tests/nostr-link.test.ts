import { describe, expect, test } from "bun:test";
import { NostrLink, parseNostrLink } from "../src/nostr-link";
import { NostrPrefix } from "@snort/shared";
import type { NostrEvent } from "../src/nostr";

describe("NostrLink", () => {
  describe("d tag handling", () => {
    test("should not decode 'd' tag when it's hex", () => {
      // Create an addressable event with a hex-looking d tag
      const hexDTag = "deadbeef1234567890abcdef";
      const event: NostrEvent = {
        id: "test123",
        kind: 30023, // addressable event kind
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", hexDTag]],
        sig: "test-sig",
      };

      // Create a NostrLink from the event
      const link = NostrLink.fromEvent(event);

      // The id should be the raw hex string, not decoded
      expect(link.id).toBe(hexDTag);
      expect(link.type).toBe(NostrPrefix.Address);
      expect(link.kind).toBe(30023);
      expect(link.author).toBe(event.pubkey);

      // Encode the link to naddr
      const encoded = link.encode();
      expect(encoded.startsWith("naddr")).toBe(true);

      // Parse it back
      const parsed = parseNostrLink(encoded);
      expect(parsed.type).toBe(NostrPrefix.Address);
      expect(parsed.id).toBe(hexDTag); // Should remain as the original string
      expect(parsed.kind).toBe(30023);
      expect(parsed.author).toBe(event.pubkey);
    });

    test("should handle non-hex 'd' tag values correctly", () => {
      const textDTag = "my-article-slug";
      const event: NostrEvent = {
        id: "test456",
        kind: 30023,
        pubkey: "2222222222222222222222222222222222222222222222222222222222222222",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", textDTag]],
        sig: "test-sig",
      };

      const link = NostrLink.fromEvent(event);
      expect(link.id).toBe(textDTag);
      expect(link.type).toBe(NostrPrefix.Address);

      // Round-trip encoding
      const encoded = link.encode();
      const parsed = parseNostrLink(encoded);
      expect(parsed.id).toBe(textDTag);
    });

    test("should handle empty 'd' tag", () => {
      const emptyDTag = "";
      const event: NostrEvent = {
        id: "test789",
        kind: 30023,
        pubkey: "3333333333333333333333333333333333333333333333333333333333333333",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", emptyDTag]],
        sig: "test-sig",
      };

      const link = NostrLink.fromEvent(event);
      expect(link.id).toBe(emptyDTag);

      // Round-trip encoding
      const encoded = link.encode();
      const parsed = parseNostrLink(encoded);
      expect(parsed.id).toBe(emptyDTag);
    });

    test("should handle 'd' tag with special characters", () => {
      const specialDTag = "test:tag/with-special_chars";
      const event: NostrEvent = {
        id: "testabc",
        kind: 30000,
        pubkey: "4444444444444444444444444444444444444444444444444444444444444444",
        created_at: 1234567890,
        content: "test content",
        tags: [["d", specialDTag]],
        sig: "test-sig",
      };

      const link = NostrLink.fromEvent(event);
      expect(link.id).toBe(specialDTag);

      // Round-trip encoding
      const encoded = link.encode();
      const parsed = parseNostrLink(encoded);
      expect(parsed.id).toBe(specialDTag);
    });
  });

  describe("tagKey", () => {
    test("should create correct tagKey for address link", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "my-article",
        30023,
        "1111111111111111111111111111111111111111111111111111111111111111",
      );

      expect(link.tagKey).toBe("30023:1111111111111111111111111111111111111111111111111111111111111111:my-article");
    });

    test("should create correct tagKey for event link", () => {
      const eventId = "abc123def456abc123def456abc123def456abc123def456abc123def456abc1";
      const link = new NostrLink(NostrPrefix.Event, eventId);

      expect(link.tagKey).toBe(eventId);
    });
  });

  describe("matchesEvent", () => {
    test("should match addressable event with correct d tag", () => {
      const dTag = "my-article";
      const pubkey = "1111111111111111111111111111111111111111111111111111111111111111";
      const kind = 30023;

      const link = new NostrLink(NostrPrefix.Address, dTag, kind, pubkey);

      const event: NostrEvent = {
        id: "test",
        kind,
        pubkey,
        created_at: 1234567890,
        content: "test",
        tags: [["d", dTag]],
        sig: "test-sig",
      };

      expect(link.matchesEvent(event)).toBe(true);
    });

    test("should not match addressable event with different d tag", () => {
      const link = new NostrLink(
        NostrPrefix.Address,
        "article-1",
        30023,
        "1111111111111111111111111111111111111111111111111111111111111111",
      );

      const event: NostrEvent = {
        id: "test",
        kind: 30023,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [["d", "article-2"]], // different d tag
        sig: "test-sig",
      };

      expect(link.matchesEvent(event)).toBe(false);
    });
  });

  describe("fromTag", () => {
    test("should parse 'a' tag correctly", () => {
      const dTag = "my-article";
      const kind = "30023";
      const author = "1111111111111111111111111111111111111111111111111111111111111111";
      const relay = "wss://relay.example.com";

      const tag = ["a", `${kind}:${author}:${dTag}`, relay];
      const link = NostrLink.fromTag(tag);

      expect(link?.type).toBe(NostrPrefix.Address);
      expect(link?.id).toBe(dTag);
      expect(link?.kind).toBe(Number(kind));
      expect(link?.author).toBe(author);
      expect(link?.relays).toEqual([relay]);
    });

    test("should parse 'a' tag with hex-like d tag", () => {
      const hexDTag = "deadbeef";
      const kind = "30023";
      const author = "2222222222222222222222222222222222222222222222222222222222222222";

      const tag = ["a", `${kind}:${author}:${hexDTag}`];
      const link = NostrLink.fromTag(tag);

      expect(link?.type).toBe(NostrPrefix.Address);
      expect(link?.id).toBe(hexDTag); // Should remain as string, not decoded
      expect(link?.kind).toBe(Number(kind));
      expect(link?.author).toBe(author);
    });
  });
});
