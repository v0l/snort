import { Nip10 } from "../src/impl/nip10";
import { describe, expect, test } from "bun:test";
import { NostrPrefix } from "@snort/shared";
import { TaggedNostrEvent } from "../src/nostr";
import { EventBuilder } from "../src/event-builder";

describe("Nip10", () => {
  describe("parseThread", () => {
    test("should correctly handle thread with p tag before e tags without markers", () => {
      // NIP-10: Deprecated positional format should only consider e/a tags
      // p tags in any position should not affect the positional interpretation
      const event = {
        content: "Reply mentioning someone",
        id: "0000000000000000000000000000000000000000000000000000000000000009",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["p", "1111111111111111111111111111111111111111111111111111111111111111"], // p tag should not affect e tag positions
          ["e", "cbf2375078000000000000000000000000000000000000000000000000000001"], // First e tag = root
          ["e", "977ac5d3b6000000000000000000000000000000000000000000000000000002"], // Middle e tag = mention
          ["e", "8f99ca1363000000000000000000000000000000000000000000000000000003"], // Last e tag = reply
        ],
      };

      const thread = Nip10.parseThread(event);

      // Positional interpretation should only count e/a tags, not p tags
      expect(thread).toMatchObject({
        root: {
          type: NostrPrefix.Event,
          id: "cbf2375078000000000000000000000000000000000000000000000000000001",
        },
        replyTo: {
          type: NostrPrefix.Event,
          id: "8f99ca1363000000000000000000000000000000000000000000000000000003",
        },
        mentions: [
          {
            type: NostrPrefix.Event,
            id: "977ac5d3b6000000000000000000000000000000000000000000000000000002",
          },
        ],
      });

      // p tag should be extracted as a pubkey mention
      expect(thread?.pubKeys).toHaveLength(1);
      expect(thread?.pubKeys[0]?.id).toBe("1111111111111111111111111111111111111111111111111111111111111111");
    });

    test("should extract thread with unmarked tags (deprecated format)", () => {
      const a = {
        content: "This is the problem with Lightning....",
        id: "868187063f0000000000000000000000000000000000000000000000000000ab",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["e", "cbf2375078000000000000000000000000000000000000000000000000000001"],
          ["e", "977ac5d3b6000000000000000000000000000000000000000000000000000002"],
          ["e", "8f99ca1363000000000000000000000000000000000000000000000000000003"],
        ],
      };

      const b = {
        content: "This is a good point, but your ...",
        id: "434ad4a646000000000000000000000000000000000000000000000000000004",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["e", "cbf2375078000000000000000000000000000000000000000000000000000001"],
          ["e", "868187063f0000000000000000000000000000000000000000000000000000ab"],
          ["e", "6834ffc491000000000000000000000000000000000000000000000000000005"],
        ],
      };

      expect(Nip10.parseThread(a)).toMatchObject({
        root: {
          type: NostrPrefix.Event,
          id: "cbf2375078000000000000000000000000000000000000000000000000000001",
        },
        replyTo: {
          type: NostrPrefix.Event,
          id: "8f99ca1363000000000000000000000000000000000000000000000000000003",
        },
        mentions: [
          {
            type: NostrPrefix.Event,
            id: "977ac5d3b6000000000000000000000000000000000000000000000000000002",
          },
        ],
      });
      expect(Nip10.parseThread(b)).toMatchObject({
        root: {
          type: NostrPrefix.Event,
          id: "cbf2375078000000000000000000000000000000000000000000000000000001",
        },
        replyTo: {
          type: NostrPrefix.Event,
          id: "6834ffc491000000000000000000000000000000000000000000000000000005",
        },
        mentions: [
          {
            type: NostrPrefix.Event,
            id: "868187063f0000000000000000000000000000000000000000000000000000ab",
          },
        ],
      });
    });

    test("should extract thread with marked tags", () => {
      const event = {
        content: "There is some middle ground ...",
        id: "6834ffc491000000000000000000000000000000000000000000000000000005",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["e", "cbf2375078000000000000000000000000000000000000000000000000000001", "", "root"],
          ["e", "868187063f0000000000000000000000000000000000000000000000000000ab", "", "reply"],
        ],
      };

      const thread = Nip10.parseThread(event);
      expect(thread).toMatchObject({
        kind: "nip10",
        root: {
          type: NostrPrefix.Event,
          id: "cbf2375078000000000000000000000000000000000000000000000000000001",
          relays: [""],
          scope: "root",
        },
        replyTo: {
          type: NostrPrefix.Event,
          id: "868187063f0000000000000000000000000000000000000000000000000000ab",
          relays: [""],
          scope: "reply",
        },
        mentions: [],
      });
      // No p-tags in the event, so pubKeys should be empty
      expect(thread?.pubKeys).toHaveLength(0);
    });

    test("should return undefined for event with no thread tags", () => {
      const event = {
        content: "Just a regular note",
        id: "6834ffc491000000000000000000000000000000000000000000000000000005",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [],
      };

      expect(Nip10.parseThread(event)).toBeUndefined();
    });

    test("should extract pubKeys from thread", () => {
      const event = {
        content: "Reply with mentions",
        id: "6834ffc491000000000000000000000000000000000000000000000000000005",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["e", "cbf2375078000000000000000000000000000000000000000000000000000001", "", "root"],
          ["p", "1111111111111111111111111111111111111111111111111111111111111111"],
          ["p", "2222222222222222222222222222222222222222222222222222222222222222"],
        ],
      };

      const thread = Nip10.parseThread(event);
      // Should have 2 p-tags from the event
      expect(thread?.pubKeys).toHaveLength(2);
      const pubKeyIds = thread?.pubKeys.map(p => p.id) || [];
      expect(pubKeyIds).toContain("1111111111111111111111111111111111111111111111111111111111111111");
      expect(pubKeyIds).toContain("2222222222222222222222222222222222222222222222222222222222222222");
    });
  });

  describe("replyTo", () => {
    test("should add replyTo pubkey when replying to a root note", () => {
      // Create a root note (no thread)
      const rootNote: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 1,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "This is the root note",
        tags: [],
        sig: "test",
        relays: ["wss://relay.example.com"],
      };

      // Create an EventBuilder to reply to the root note
      const eb = new EventBuilder();
      eb.kind(1).pubKey("cccc000000000000000000000000000000000000000000000000000000000003").content("This is a reply");

      // Call replyTo to add the reply tags
      Nip10.replyTo(rootNote, eb);

      // Build the event
      const replyEvent = eb.build();

      // Verify that the replyTo pubkey was added
      const pTags = replyEvent.tags.filter(t => t[0] === "p");
      expect(pTags.length).toBe(1);
      expect(pTags[0][1]).toBe("bbbb000000000000000000000000000000000000000000000000000000000002");

      // Verify root tag was added
      const eTags = replyEvent.tags.filter(t => t[0] === "e");
      expect(eTags.length).toBe(1);
      expect(eTags[0][1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001");
      expect(eTags[0][3]).toBe("root");
    });

    test("should not add replyTo pubkey if it's the same as the author", () => {
      // Create a root note
      const samePubkey = "bbbb000000000000000000000000000000000000000000000000000000000002";
      const rootNote: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 1,
        pubkey: samePubkey,
        created_at: 1234567890,
        content: "This is the root note",
        tags: [],
        sig: "test",
        relays: ["wss://relay.example.com"],
      };

      // Create an EventBuilder to reply to their own note
      const eb = new EventBuilder();
      eb.kind(1).pubKey(samePubkey).content("This is a self-reply");

      // Call replyTo
      Nip10.replyTo(rootNote, eb);

      // Build the event
      const replyEvent = eb.build();

      // Verify that no p-tag was added (since it's a self-reply)
      const pTags = replyEvent.tags.filter(t => t[0] === "p");
      expect(pTags.length).toBe(0);
    });

    test("should add all thread participants when replying to a threaded note", () => {
      // Create a threaded note (reply to another note)
      const threadedNote: TaggedNostrEvent = {
        id: "dddd000000000000000000000000000000000000000000000000000000000004",
        kind: 1,
        pubkey: "eeee000000000000000000000000000000000000000000000000000000000005",
        created_at: 1234567890,
        content: "This is a reply in a thread",
        tags: [
          ["e", "aaaa000000000000000000000000000000000000000000000000000000000001", "", "root"],
          ["e", "cccc000000000000000000000000000000000000000000000000000000000003", "", "reply"],
          ["p", "bbbb000000000000000000000000000000000000000000000000000000000002"], // Original author
          ["p", "ffff000000000000000000000000000000000000000000000000000000000006"], // Another participant
        ],
        sig: "test",
        relays: ["wss://relay.example.com"],
      };

      // Create an EventBuilder to reply to the threaded note
      const newAuthor = "9999000000000000000000000000000000000000000000000000000000000009";
      const eb = new EventBuilder();
      eb.kind(1).pubKey(newAuthor).content("Joining the thread");

      // Call replyTo
      Nip10.replyTo(threadedNote, eb);

      // Build the event
      const replyEvent = eb.build();

      // Verify that all participants are in p-tags (excluding the new author)
      const pTags = replyEvent.tags.filter(t => t[0] === "p");
      const pTagIds = pTags.map(t => t[1]);

      // Should include all previous participants
      expect(pTagIds).toContain("bbbb000000000000000000000000000000000000000000000000000000000002");
      expect(pTagIds).toContain("ffff000000000000000000000000000000000000000000000000000000000006");

      // Should NOT include the new author's own pubkey
      expect(pTagIds).not.toContain(newAuthor);

      // Verify thread structure (root and reply tags)
      const eTags = replyEvent.tags.filter(t => t[0] === "e");
      expect(eTags.length).toBe(2);

      // First should be the root tag
      const rootTag = eTags.find(t => t[3] === "root");
      expect(rootTag).toBeDefined();
      expect(rootTag![1]).toBe("aaaa000000000000000000000000000000000000000000000000000000000001");

      // Second should be the reply tag (to the note we're replying to)
      const replyTag = eTags.find(t => t[3] === "reply");
      expect(replyTag).toBeDefined();
      expect(replyTag![1]).toBe("dddd000000000000000000000000000000000000000000000000000000000004");
    });

    test("should add replyTo pubkey for note author when replying to threaded note with p-tags", () => {
      // Create a threaded note WITH p-tags (including the author)
      const threadedNote: TaggedNostrEvent = {
        id: "dddd000000000000000000000000000000000000000000000000000000000004",
        kind: 1,
        pubkey: "eeee000000000000000000000000000000000000000000000000000000000005",
        created_at: 1234567890,
        content: "This is a reply in a thread",
        tags: [
          ["e", "aaaa000000000000000000000000000000000000000000000000000000000001", "", "root"],
          ["e", "cccc000000000000000000000000000000000000000000000000000000000003", "", "reply"],
          ["p", "eeee000000000000000000000000000000000000000000000000000000000005"], // Author's own pubkey
          ["p", "bbbb000000000000000000000000000000000000000000000000000000000002"], // Original thread starter
        ],
        sig: "test",
        relays: ["wss://relay.example.com"],
      };

      // Create an EventBuilder to reply to the threaded note
      const newAuthor = "9999000000000000000000000000000000000000000000000000000000000009";
      const eb = new EventBuilder();
      eb.kind(1).pubKey(newAuthor).content("Joining the thread");

      // Call replyTo
      Nip10.replyTo(threadedNote, eb);

      // Build the event
      const replyEvent = eb.build();

      // Verify that all thread participants are included in p-tags
      const pTags = replyEvent.tags.filter(t => t[0] === "p");
      const pTagIds = pTags.map(t => t[1]);

      // Should include the author of the note we're replying to
      expect(pTagIds).toContain("eeee000000000000000000000000000000000000000000000000000000000005");
      // Should include the original thread starter
      expect(pTagIds).toContain("bbbb000000000000000000000000000000000000000000000000000000000002");
      // Should NOT include our own pubkey
      expect(pTagIds).not.toContain(newAuthor);
    });

    test("should add replyTo pubkey when author is in e-tag but not p-tags", () => {
      // Real-world example: event has author in e-tags (4th element) but not in p-tags
      const event: TaggedNostrEvent = {
        id: "9821c91621f391a49e340250b97c372811129935f0bea3c84e81191d23a7342d",
        kind: 1,
        pubkey: "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
        created_at: 1761313035,
        content: "what were all the deletions?",
        tags: [
          [
            "e",
            "15c69902c1429b21023d2b7d8233f2f23ff14e24a29e63084bd357c7725310f3",
            "wss://nos.lol/",
            "root",
            "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
          ],
          [
            "e",
            "15c69902c1429b21023d2b7d8233f2f23ff14e24a29e63084bd357c7725310f3",
            "wss://nos.lol/",
            "reply",
            "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
          ],
          ["p", "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"],
          [
            "client",
            "noStrudel",
            "31990:266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5:1686066542546",
          ],
        ],
        sig: "9688006fb4f19a7ddf10f91fe509eac04546abc83c66abd3917b9f8e2b540a1fc3afdbc51f26e8c3ac3714b9b1ba1199aa93256eb18cc584e752cf186634f777",
        relays: ["wss://relay.snort.social/", "wss://relay.damus.io/"],
      };

      // Create an EventBuilder to reply to this event
      const replyingAuthor = "aaaa111111111111111111111111111111111111111111111111111111111111";
      const eb = new EventBuilder();
      eb.kind(1).pubKey(replyingAuthor).content("Replying to your question");

      // Call replyTo
      Nip10.replyTo(event, eb);

      // Build the event
      const replyEvent = eb.build();

      // Verify p-tags
      const pTags = replyEvent.tags.filter(t => t[0] === "p");
      const pTagIds = pTags.map(t => t[1]);

      // Should include the person already mentioned in p-tags
      expect(pTagIds).toContain("63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed");

      // IMPORTANT: Should also include the author of the event we're replying to
      // (This is what the test is specifically checking)
      expect(pTagIds).toContain("266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5");

      // Should NOT include our own pubkey
      expect(pTagIds).not.toContain(replyingAuthor);

      // Verify we have exactly 2 p-tags (the original p-tag + the author's pubkey)
      expect(pTags.length).toBe(2);
    });

    test("should not add duplicate p-tag when author is already in thread p-tags", () => {
      // Event where the author's pubkey is already in the p-tags
      const event: TaggedNostrEvent = {
        id: "aaaa000000000000000000000000000000000000000000000000000000000001",
        kind: 1,
        pubkey: "bbbb000000000000000000000000000000000000000000000000000000000002",
        created_at: 1234567890,
        content: "A threaded reply",
        tags: [
          ["e", "cccc000000000000000000000000000000000000000000000000000000000003", "", "root"],
          ["e", "dddd000000000000000000000000000000000000000000000000000000000004", "", "reply"],
          ["p", "eeee000000000000000000000000000000000000000000000000000000000005"], // Other participant
          ["p", "bbbb000000000000000000000000000000000000000000000000000000000002"], // Author's own pubkey
        ],
        sig: "test",
        relays: ["wss://relay.example.com"],
      };

      // Create an EventBuilder to reply
      const replyingAuthor = "ffff000000000000000000000000000000000000000000000000000000000006";
      const eb = new EventBuilder();
      eb.kind(1).pubKey(replyingAuthor).content("My reply");

      // Call replyTo
      Nip10.replyTo(event, eb);

      // Build the event
      const replyEvent = eb.build();

      // Verify p-tags
      const pTags = replyEvent.tags.filter(t => t[0] === "p");
      const pTagIds = pTags.map(t => t[1]);

      // Should include the other participant
      expect(pTagIds).toContain("eeee000000000000000000000000000000000000000000000000000000000005");

      // Should include the author (bbbb...0002) exactly once
      expect(pTagIds).toContain("bbbb000000000000000000000000000000000000000000000000000000000002");

      // Count occurrences of the author's pubkey - should be exactly 1
      const authorCount = pTagIds.filter(
        id => id === "bbbb000000000000000000000000000000000000000000000000000000000002",
      ).length;
      expect(authorCount).toBe(1);

      // Should have exactly 2 p-tags total (other participant + author, no duplicates)
      expect(pTags.length).toBe(2);
    });
  });

  describe("parsing non-text-note events", () => {
    test("should parse reaction (kind 7) per NIP-25", () => {
      // NIP-25: Reactions MUST have an e tag to the event being reacted to
      // and SHOULD have a p tag to the author
      const reaction: TaggedNostrEvent = {
        id: "92723125c4a564f90a073ac4a0073f440d8b472453a42d7a32bbf710f1503d11",
        kind: 7,
        pubkey: "20d29810d6a5f92b045ade02ebbadc9036d741cc686b00415c42b4236fe4ad2f",
        created_at: 1674164545,
        content: "+", // "+" for like, "-" for dislike, or emoji
        tags: [
          ["e", "3624762a1274dd9636e0c552b53086d70bc88c165bc4dc0f9e836a1eaf86c3b8", "wss://relay.damus.io/"],
          ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", "wss://nos.lol/"],
          ["k", "1"], // Optional: kind of event being reacted to
        ],
        sig: "918404170b25a1f3f08f73ffcca60ea8fef7b077c99ae1dc44ac1e6c6f6341709f6f604b8134636c50f64ef86956ff8126b6beaa7ecef5d30fcde7faaa6dba9c",
        relays: ["wss://relay.damus.io/"],
      };

      const thread = Nip10.parseThread(reaction);

      // Should parse the single e tag as root (positional interpretation)
      expect(thread).toBeDefined();
      expect(thread?.root).toBeDefined();
      expect(thread?.root?.id).toBe("3624762a1274dd9636e0c552b53086d70bc88c165bc4dc0f9e836a1eaf86c3b8");
      expect(thread?.root?.scope).toBe("root");
      expect(thread?.root?.relays).toContain("wss://relay.damus.io/");

      // Should extract the p tag (author of event being reacted to)
      expect(thread?.pubKeys).toHaveLength(1);
      expect(thread?.pubKeys[0]?.id).toBe("32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245");
    });

    test("should parse repost (kind 6) per NIP-18", () => {
      // NIP-18: Reposts MUST include e tag with relay URL and SHOULD include p tag
      const repost: TaggedNostrEvent = {
        id: "a8c2eb89f3c7f6d8b2e4a1c9d7f3e6b8a5c1d9e7f4b2a8c6e3d1f9b7a4c2e8d6",
        kind: 6,
        pubkey: "9630f464cca6a5147aa8a35f0bcdd3ce485324e732fd39e09233b1d848238f31",
        created_at: 1674165000,
        content:
          '{"kind":1,"content":"Great insights!","pubkey":"32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",...}',
        tags: [
          ["e", "3624762a1274dd9636e0c552b53086d70bc88c165bc4dc0f9e836a1eaf86c3b8", "wss://relay.damus.io/"],
          ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
        ],
        sig: "signature...",
        relays: ["wss://nos.lol/"],
      };

      const thread = Nip10.parseThread(repost);

      // Should parse the e tag as root
      expect(thread).toBeDefined();
      expect(thread?.root).toBeDefined();
      expect(thread?.root?.id).toBe("3624762a1274dd9636e0c552b53086d70bc88c165bc4dc0f9e836a1eaf86c3b8");
      expect(thread?.root?.relays).toContain("wss://relay.damus.io/");

      // Should extract the p tag (author of original event)
      expect(thread?.pubKeys).toHaveLength(1);
      expect(thread?.pubKeys[0]?.id).toBe("32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245");
    });

    test("should parse zap receipt (kind 9735) per NIP-57", () => {
      // NIP-57: Zap receipts MUST include p tag (recipient), optional e tag (zapped event),
      // and optional P tag (sender)
      const zapReceipt: TaggedNostrEvent = {
        id: "67b48a14fb66c60c8f9070bdeb37afdfcc3d08ad01989460448e4081eddda446",
        kind: 9735,
        pubkey: "9630f464cca6a5147aa8a35f0bcdd3ce485324e732fd39e09233b1d848238f31", // LNURL provider pubkey
        created_at: 1674164545,
        content: "",
        tags: [
          ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"], // Zap recipient
          ["P", "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322"], // Zap sender
          ["e", "3624762a1274dd9636e0c552b53086d70bc88c165bc4dc0f9e836a1eaf86c3b8"], // Event being zapped
          ["bolt11", "lnbc10u1p3unwfupp5t9pcx73rn3j52qg7..."],
          ["description", '{"pubkey":"97c70a44...","content":"","kind":9734,...}'],
          ["preimage", "5d006d2cf1e73c7148e7519a4c68adc81642ce0e25a432b2434c99f97344c15f"],
        ],
        sig: "signature...",
        relays: ["wss://relay.damus.io/"],
      };

      const thread = Nip10.parseThread(zapReceipt);

      // Should parse the e tag as root
      expect(thread).toBeDefined();
      expect(thread?.root).toBeDefined();
      expect(thread?.root?.id).toBe("3624762a1274dd9636e0c552b53086d70bc88c165bc4dc0f9e836a1eaf86c3b8");

      // Should extract p tag (recipient) - P tag (sender) is not a standard profile tag
      expect(thread?.pubKeys.length).toBeGreaterThanOrEqual(1);
      const pubKeyIds = thread?.pubKeys.map(p => p.id);
      expect(pubKeyIds).toContain("32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245");
    });

    test("should parse emoji reaction with relay hints", () => {
      // Real-world emoji reaction with proper relay hints
      const reaction: TaggedNostrEvent = {
        id: "f8b3d9e1a2c4f6e8d0b2a4c6e8f0d2b4a6c8e0f2d4b6a8c0e2f4d6b8a0c2e4f6",
        kind: 7,
        pubkey: "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
        created_at: 1674165200,
        content: "🔥", // Emoji reaction
        tags: [
          ["e", "2bcd9cf56db44d1a9f2499110ab1924450cd87fe7989ec0b1cce565f7b0465f7", "wss://relay.damus.io/"],
          ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", "wss://nos.lol/"],
          ["k", "1"],
        ],
        sig: "sig...",
        relays: ["wss://relay.damus.io/"],
      };

      const thread = Nip10.parseThread(reaction);

      expect(thread?.root?.id).toBe("2bcd9cf56db44d1a9f2499110ab1924450cd87fe7989ec0b1cce565f7b0465f7");
      expect(thread?.pubKeys[0]?.id).toBe("32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245");
    });
  });
});
