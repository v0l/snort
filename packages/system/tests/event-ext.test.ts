import { EventExt } from "../src/event-ext";

describe("NIP-10", () => {
  it("should extract thread", () => {
    const a = {
      content: "This is the problem with Lightning....",
      id: "868187063f...",
      kind: 1,
      created_at: 1,
      pubkey: "test",
      sig: "test",
      tags: [
        ["e", "cbf2375078..."],
        ["e", "977ac5d3b6..."],
        ["e", "8f99ca1363..."],
      ],
    };

    const b = {
      content: "This is a good point, but your ...",
      id: "434ad4a646...",
      kind: 1,
      created_at: 1,
      pubkey: "test",
      sig: "test",
      tags: [
        ["e", "cbf2375078..."],
        ["e", "868187063f..."],
        ["e", "6834ffc491..."],
      ],
    };

    const c = {
      content: "There is some middle ground ...",
      id: "6834ffc491...",
      kind: 1,
      created_at: 1,
      pubkey: "test",
      sig: "test",
      tags: [
        ["e", "cbf2375078...", "", "root"],
        ["e", "868187063f...", "", "reply"],
      ],
    };

    expect(EventExt.extractThread(a)).toMatchObject({
      root: { key: "e", value: "cbf2375078...", marker: "root" },
      replyTo: { key: "e", value: "8f99ca1363...", marker: "reply" },
      mentions: [{ key: "e", value: "977ac5d3b6...", marker: "mention" }],
    });
    expect(EventExt.extractThread(b)).toMatchObject({
      root: { key: "e", value: "cbf2375078...", marker: "root" },
      replyTo: { key: "e", value: "6834ffc491...", marker: "reply" },
      mentions: [{ key: "e", value: "868187063f...", marker: "mention" }],
    });
    expect(EventExt.extractThread(c)).toMatchObject({
      root: { key: "e", value: "cbf2375078...", relay: "", marker: "root" },
      replyTo: { key: "e", value: "868187063f...", relay: "", marker: "reply" },
      mentions: [],
    });
  });
});
