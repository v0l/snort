import { EventExt, EventType } from "../src/event-ext";
import { describe, expect, test } from "bun:test";
import { NostrPrefix } from "@snort/shared";
import { NostrEvent } from "../src/nostr";
import EventKind from "../src/event-kind";

describe("EventExt", () => {
  describe("NIP-10 - extractThread", () => {
    test("should parse reaction with non-hex author field in e tag", () => {
      // Real-world case where tag[3] is a pubkey (author) but tag looks like relay URL
      const reaction = {
        content: ":purple-heart:",
        created_at: 1761043616,
        id: "92723125c4a564f90a073ac4a0073f440d8b472453a42d7a32bbf710f1503d11",
        kind: 7,
        pubkey: "20d29810d6a5f92b045ade02ebbadc9036d741cc686b00415c42b4236fe4ad2f",
        sig: "918404170b25a1f3f08f73ffcca60ea8fef7b077c99ae1dc44ac1e6c6f6341709f6f604b8134636c50f64ef86956ff8126b6beaa7ecef5d30fcde7faaa6dba9c",
        tags: [
          [
            "e",
            "2bcd9cf56db44d1a9f2499110ab1924450cd87fe7989ec0b1cce565f7b0465f7",
            "wss://relay.damus.io/",
            "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
          ],
          ["p", "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed", "wss://relay.damus.io/"],
          ["k", "1"],
          ["emoji", "purple-heart", "https://em-content.zobj.net/source/microsoft-teams/363/purple-heart_1f49c.png"],
        ],
      };

      const thread = EventExt.extractThread(reaction);

      // Should extract the event reference with the relay and author
      expect(thread).toMatchObject({
        kind: "nip10",
        root: {
          type: NostrPrefix.Event,
          id: "2bcd9cf56db44d1a9f2499110ab1924450cd87fe7989ec0b1cce565f7b0465f7",
          relays: ["wss://relay.damus.io/"],
          author: "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
          scope: "root",
        },
      });

      // Should also extract the pubkey mention from p tag
      expect(thread?.pubKeys).toHaveLength(1);
      expect(thread?.pubKeys[0]).toMatchObject({
        type: NostrPrefix.Profile,
        id: "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
      });
    });

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

      const thread = EventExt.extractThread(event);

      // Positional interpretation should only count e/a tags, not p tags
      expect(thread).toMatchObject({
        kind: "nip10",
        root: {
          type: NostrPrefix.Event,
          id: "cbf2375078000000000000000000000000000000000000000000000000000001",
          scope: "root",
        },
        replyTo: {
          type: NostrPrefix.Event,
          id: "8f99ca1363000000000000000000000000000000000000000000000000000003",
          scope: "reply",
        },
        mentions: [
          {
            type: NostrPrefix.Event,
            id: "977ac5d3b6000000000000000000000000000000000000000000000000000002",
            scope: "mention",
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

      expect(EventExt.extractThread(a)).toMatchObject({
        kind: "nip10",
        root: {
          type: NostrPrefix.Event,
          id: "cbf2375078000000000000000000000000000000000000000000000000000001",
          scope: "root",
        },
        replyTo: {
          type: NostrPrefix.Event,
          id: "8f99ca1363000000000000000000000000000000000000000000000000000003",
          scope: "reply",
        },
        mentions: [
          {
            type: NostrPrefix.Event,
            id: "977ac5d3b6000000000000000000000000000000000000000000000000000002",
            scope: "mention",
          },
        ],
      });
      expect(EventExt.extractThread(b)).toMatchObject({
        kind: "nip10",
        root: {
          type: NostrPrefix.Event,
          id: "cbf2375078000000000000000000000000000000000000000000000000000001",
          scope: "root",
        },
        replyTo: {
          type: NostrPrefix.Event,
          id: "6834ffc491000000000000000000000000000000000000000000000000000005",
          scope: "reply",
        },
        mentions: [
          {
            type: NostrPrefix.Event,
            id: "868187063f0000000000000000000000000000000000000000000000000000ab",
            scope: "mention",
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

      expect(EventExt.extractThread(event)).toMatchObject({
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
    });

    test("should return undefined for event with no thread tags", () => {
      const event = {
        content: "Just a regular note",
        id: "aaaa111111111111111111111111111111111111111111111111111111111111",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [],
      };

      expect(EventExt.extractThread(event)).toBeUndefined();
    });

    test("should extract pubKeys from thread", () => {
      const event = {
        content: "Reply with mentions",
        id: "bbbb222222222222222222222222222222222222222222222222222222222222",
        kind: 1,
        created_at: 1,
        pubkey: "0000000000000000000000000000000000000000000000000000000000000001",
        sig: "test",
        tags: [
          ["e", "cbf2375078000000000000000000000000000000000000000000000000000001", "", "root"],
          ["e", "dddd333333333333333333333333333333333333333333333333333333333333", "", "reply"],
          ["p", "1111111111111111111111111111111111111111111111111111111111111111"],
          ["p", "2222222222222222222222222222222222222222222222222222222222222222"],
        ],
      };

      const thread = EventExt.extractThread(event);
      expect(thread?.pubKeys).toHaveLength(2);
      expect(thread?.pubKeys[0]).toMatchObject({
        type: NostrPrefix.Profile,
        id: "1111111111111111111111111111111111111111111111111111111111111111",
      });
    });
  });

  describe("getType", () => {
    test("should identify regular events", () => {
      expect(EventExt.getType(1)).toBe(EventType.Regular);
      expect(EventExt.getType(7)).toBe(EventType.Regular);
      expect(EventExt.getType(9999)).toBe(EventType.Regular);
    });

    test("should identify replaceable events", () => {
      expect(EventExt.getType(0)).toBe(EventType.Replaceable); // metadata
      expect(EventExt.getType(3)).toBe(EventType.Replaceable); // contacts
      expect(EventExt.getType(10000)).toBe(EventType.Replaceable);
      expect(EventExt.getType(10002)).toBe(EventType.Replaceable);
      expect(EventExt.getType(19999)).toBe(EventType.Replaceable);
    });

    test("should identify addressable events", () => {
      expect(EventExt.getType(30000)).toBe(EventType.Addressable);
      expect(EventExt.getType(30023)).toBe(EventType.Addressable); // long-form
      expect(EventExt.getType(39999)).toBe(EventType.Addressable);
    });
  });

  describe("isReplaceable", () => {
    test("should return true for replaceable events", () => {
      expect(EventExt.isReplaceable(0)).toBe(true);
      expect(EventExt.isReplaceable(3)).toBe(true);
      expect(EventExt.isReplaceable(10002)).toBe(true);
    });

    test("should return true for addressable events", () => {
      expect(EventExt.isReplaceable(30023)).toBe(true);
      expect(EventExt.isReplaceable(30001)).toBe(true);
    });

    test("should return false for regular events", () => {
      expect(EventExt.isReplaceable(1)).toBe(false);
      expect(EventExt.isReplaceable(7)).toBe(false);
    });
  });

  describe("keyOf", () => {
    test("should create key for regular event", () => {
      const event = {
        id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        kind: 1,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [],
        sig: "test",
      } as NostrEvent;

      expect(EventExt.keyOf(event)).toBe("abc123def456abc123def456abc123def456abc123def456abc123def456abc1");
    });

    test("should create key for replaceable event", () => {
      const event = {
        id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        kind: 0,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [],
        sig: "test",
      } as NostrEvent;

      expect(EventExt.keyOf(event)).toBe("0:1111111111111111111111111111111111111111111111111111111111111111");
    });

    test("should create key for addressable event", () => {
      const event = {
        id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        kind: 30023,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [["d", "my-article"]],
        sig: "test",
      } as NostrEvent;

      expect(EventExt.keyOf(event)).toBe(
        "30023:1111111111111111111111111111111111111111111111111111111111111111:my-article",
      );
    });
  });

  describe("getRootPubKey", () => {
    test("should return event pubkey when no delegation", () => {
      const event = {
        id: "test",
        kind: 1,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [],
        sig: "test",
      } as NostrEvent;

      expect(EventExt.getRootPubKey(event)).toBe("1111111111111111111111111111111111111111111111111111111111111111");
    });

    test("should return delegator pubkey when delegation tag exists", () => {
      const event = {
        id: "test",
        kind: 1,
        pubkey: "2222222222222222222222222222222222222222222222222222222222222222",
        created_at: 1234567890,
        content: "test",
        tags: [["delegation", "1111111111111111111111111111111111111111111111111111111111111111", "kind=1", "sig=xxx"]],
        sig: "test",
      } as NostrEvent;

      expect(EventExt.getRootPubKey(event)).toBe("1111111111111111111111111111111111111111111111111111111111111111");
    });
  });

  describe("createId", () => {
    test("should create consistent event ID", () => {
      const event = {
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        kind: 1,
        created_at: 1234567890,
        content: "Hello, world!",
        tags: [],
      };

      const id1 = EventExt.createId(event);
      const id2 = EventExt.createId(event);

      expect(id1).toBe(id2);
      expect(id1).toHaveLength(64);
    });

    test("should create different IDs for different content", () => {
      const event1 = {
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        kind: 1,
        created_at: 1234567890,
        content: "Hello",
        tags: [],
      };

      const event2 = {
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        kind: 1,
        created_at: 1234567890,
        content: "World",
        tags: [],
      };

      const id1 = EventExt.createId(event1);
      const id2 = EventExt.createId(event2);

      expect(id1).not.toBe(id2);
    });
  });

  describe("forPubKey", () => {
    test("should create event template for pubkey", () => {
      const pubkey = "1111111111111111111111111111111111111111111111111111111111111111";
      const event = EventExt.forPubKey(pubkey, EventKind.TextNote);

      expect(event.pubkey).toBe(pubkey);
      expect(event.kind).toBe(EventKind.TextNote);
      expect(event.content).toBe("");
      expect(event.tags).toEqual([]);
      expect(event.created_at).toBeGreaterThan(0);
    });
  });

  describe("fixupEvent", () => {
    test("should add missing properties", () => {
      const event = {
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
      } as any;

      EventExt.fixupEvent(event);

      expect(event.tags).toEqual([]);
      expect(event.created_at).toBe(0);
      expect(event.content).toBe("");
      expect(event.id).toBe("");
      expect(event.kind).toBe(0);
      expect(event.sig).toBe("");
    });

    test("should not override existing properties", () => {
      const event = {
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        kind: 1,
        created_at: 123456,
        content: "test",
        tags: [["e", "abc"]],
        id: "test-id",
        sig: "test-sig",
      } as NostrEvent;

      EventExt.fixupEvent(event);

      expect(event.kind).toBe(1);
      expect(event.created_at).toBe(123456);
      expect(event.content).toBe("test");
      expect(event.tags).toEqual([["e", "abc"]]);
      expect(event.id).toBe("test-id");
      expect(event.sig).toBe("test-sig");
    });
  });

  describe("isValid", () => {
    test("should return true for valid regular event", () => {
      const event = {
        id: "test",
        kind: 1,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [],
        sig: "test-sig",
      } as NostrEvent;

      expect(EventExt.isValid(event)).toBe(true);
    });

    test("should return false for event without signature", () => {
      const event = {
        id: "test",
        kind: 1,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [],
      } as any;

      expect(EventExt.isValid(event)).toBe(false);
    });

    test("should return false for addressable event without d tag", () => {
      const event = {
        id: "test",
        kind: 30023,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [],
        sig: "test-sig",
      } as NostrEvent;

      expect(EventExt.isValid(event)).toBe(false);
    });

    test("should return true for addressable event with d tag", () => {
      const event = {
        id: "test",
        kind: 30023,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [["d", "my-article"]],
        sig: "test-sig",
      } as NostrEvent;

      expect(EventExt.isValid(event)).toBe(true);
    });
  });

  describe("sign and verify", () => {
    test("should sign and verify event", () => {
      const privateKey = "0000000000000000000000000000000000000000000000000000000000000001";
      const event = {
        pubkey: "",
        kind: 1,
        created_at: 1234567890,
        content: "Hello, world!",
        tags: [],
        id: "",
        sig: "",
      } as NostrEvent;

      EventExt.sign(event, privateKey);

      expect(event.pubkey).toHaveLength(64);
      expect(event.id).toHaveLength(64);
      expect(event.sig).toHaveLength(128);
      expect(EventExt.verify(event)).toBe(true);
    });

    test("should fail verification with modified content", () => {
      const privateKey = "0000000000000000000000000000000000000000000000000000000000000001";
      const event = {
        pubkey: "",
        kind: 1,
        created_at: 1234567890,
        content: "Hello, world!",
        tags: [],
        id: "",
        sig: "",
      } as NostrEvent;

      EventExt.sign(event, privateKey);
      event.content = "Modified content";

      expect(EventExt.verify(event)).toBe(false);
    });

    test("should fail verification with invalid signature", () => {
      const event = {
        id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
        kind: 1,
        pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
        created_at: 1234567890,
        content: "test",
        tags: [],
        sig: "invalidsig",
      } as NostrEvent;

      expect(EventExt.verify(event)).toBe(false);
    });
  });
});
