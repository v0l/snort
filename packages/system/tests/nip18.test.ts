import { Nip18 } from "../src/impl/nip18";
import { describe, expect, test } from "bun:test";
import { NostrPrefix } from "@snort/shared";
import { NostrLink, LinkScope } from "../src/nostr-link";

describe("Nip18", () => {
  describe("linkToTag", () => {
    test("should throw error if link is not a quote", () => {
      // Create a link without Quote scope
      const link = new NostrLink(NostrPrefix.Event, "bbbb111111111111111111111111111111111111111111111111111111111111");
      link.scope = LinkScope.Root;

      expect(() => Nip18.linkToTag(link)).toThrow("Link is not a quote");
    });

    test("q tags should contain 4 elements without markers when author is present", () => {
      // Create a NostrLink with Quote scope and author
      const quoteLink = new NostrLink(
        NostrPrefix.Event,
        "bbbb111111111111111111111111111111111111111111111111111111111111",
        1, // kind hint
        "cccc222222222222222222222222222222222222222222222222222222222222", // author
        ["wss://relay.example.com"],
      );
      quoteLink.scope = LinkScope.Quote;

      // Convert to tag using Nip18
      const tag = Nip18.linkToTag(quoteLink);

      // Verify the q tag has exactly 4 elements: tag name, event id, relay, author
      expect(tag).toBeDefined();
      expect(tag.length).toBe(4);
      expect(tag[0]).toBe("q");
      expect(tag[1]).toBe("bbbb111111111111111111111111111111111111111111111111111111111111");
      expect(tag[2]).toBe("wss://relay.example.com");
      expect(tag[3]).toBe("cccc222222222222222222222222222222222222222222222222222222222222");

      // Verify there's no marker (element at index 3 should be author, not a marker)
      expect(["root", "reply", "mention"]).not.toContain(tag[3]);
    });

    test("q tags should contain 3 elements when only relay is present", () => {
      // Create a quote link without author
      const quoteLink = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        1,
        undefined, // no author
        ["wss://relay.example.com"],
      );
      quoteLink.scope = LinkScope.Quote;

      const tag = Nip18.linkToTag(quoteLink);

      expect(tag.length).toBe(3);
      expect(tag[0]).toBe("q");
      expect(tag[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001");
      expect(tag[2]).toBe("wss://relay.example.com");
    });

    test("q tags should contain 2 elements when no relay or author", () => {
      // Minimal quote link
      const quoteLink = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
      );
      quoteLink.scope = LinkScope.Quote;

      const tag = Nip18.linkToTag(quoteLink);

      expect(tag.length).toBe(2);
      expect(tag[0]).toBe("q");
      expect(tag[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001");
    });

    test("q tags should add empty relay when author is present but relay is missing", () => {
      // Quote link with author but no relay
      const quoteLink = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        1,
        "bbbb111111111111111111111111111111111111111111111111111111111111", // author
        undefined, // no relays
      );
      quoteLink.scope = LinkScope.Quote;

      const tag = Nip18.linkToTag(quoteLink);

      // Should have 4 elements with empty string for relay
      expect(tag.length).toBe(4);
      expect(tag[0]).toBe("q");
      expect(tag[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001");
      expect(tag[2]).toBe(""); // empty relay
      expect(tag[3]).toBe("bbbb111111111111111111111111111111111111111111111111111111111111");
    });

    test("q tags for addresses (NIP-33) should use kind:author:d-tag format with 3 elements", () => {
      // Create an address link with Quote scope (for parameterized replaceable events)
      const addressLink = new NostrLink(
        NostrPrefix.Address,
        "my-article-slug", // d-tag identifier
        30023, // kind for long-form content
        "cccc222222222222222222222222222222222222222222222222222222222222", // author
        ["wss://relay.example.com"],
      );
      addressLink.scope = LinkScope.Quote;

      // Convert to tag using Nip18
      const tag = Nip18.linkToTag(addressLink);

      // Per NIP-18 spec: pubkey only added "if-a-regular-event"
      // For addresses, author is already encoded in kind:author:d-tag
      expect(tag).toBeDefined();
      expect(tag.length).toBe(3); // q tags for addresses: ["q", "kind:author:d-tag", relay]
      expect(tag[0]).toBe("q");
      expect(tag[1]).toBe("30023:cccc222222222222222222222222222222222222222222222222222222222222:my-article-slug");
      expect(tag[2]).toBe("wss://relay.example.com");
    });

    test("q tags for addresses without relay should contain 2 elements", () => {
      // Address link without relay
      const addressLink = new NostrLink(
        NostrPrefix.Address,
        "test-article",
        30023,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
      );
      addressLink.scope = LinkScope.Quote;

      const tag = Nip18.linkToTag(addressLink);

      // No relay, no author (author already in tagKey for addresses)
      expect(tag.length).toBe(2);
      expect(tag[0]).toBe("q");
      expect(tag[1]).toBe("30023:aaaa000000000000000000000000000000000000000000000000000000000001:test-article");
    });

    test("q tags should handle empty relay array", () => {
      // Quote link with empty relay array
      const quoteLink = new NostrLink(
        NostrPrefix.Event,
        "aaaa000000000000000000000000000000000000000000000000000000000001",
        1,
        "bbbb111111111111111111111111111111111111111111111111111111111111",
        [], // empty array
      );
      quoteLink.scope = LinkScope.Quote;

      const tag = Nip18.linkToTag(quoteLink);

      // Should add empty relay when author is present
      expect(tag.length).toBe(4);
      expect(tag[0]).toBe("q");
      expect(tag[1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001");
      expect(tag[2]).toBe(""); // empty relay
      expect(tag[3]).toBe("bbbb111111111111111111111111111111111111111111111111111111111111");
    });
  });
});
