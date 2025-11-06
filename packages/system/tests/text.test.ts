import { describe, expect, test } from "bun:test";
import { transformText } from "../src";
import { sha256 } from "@snort/shared";

describe("transformText", () => {
  describe("links", () => {
    test("parse youtube link", () => {
      const str = "GM\nhttps://music.youtube.com/watch?v=_ajDU1P9qmo";

      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "GM\n",
      });
      expect(frags[1]).toMatchObject({
        type: "link",
        content: "https://music.youtube.com/watch?v=_ajDU1P9qmo",
      });
    });

    test("parse http link", () => {
      const str = "Check this out http://example.com";
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Check this out ",
      });
      expect(frags[1]).toMatchObject({
        type: "link",
        content: "http://example.com",
      });
    });

    test("parse https link", () => {
      const str = "Visit https://nostr.com";
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Visit ",
      });
      expect(frags[1]).toMatchObject({
        type: "link",
        content: "https://nostr.com",
      });
    });

    test("parse magnet link", () => {
      const magnet =
        "magnet:?xt=urn:btih:f21febdf8c54d2a9b09ed54f7eebb909537fb7b0&dn=bitcoin-core-27.2&tr=http%3A%2F%2Ftracker.loadpeers.org%3A8080%2FxvRKfvAlnfuf5EfxTT5T0KIVPtbqAHnX%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337";
      const str = `Download ${magnet}`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Download ",
      });
      expect(frags[1]).toMatchObject({
        type: "magnet",
        content: magnet,
      });
    });

    test("parse blossom link", () => {
      const blossomUrl = `blossom:b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553.pdf?xs=cdn.example.com&as=ec4425ff5e9446080d2f70440188e3ca5d6da8713db7bdeef73d0ed54d9093f0&sz=184292`;
      const str = `Check out this cool meme ${blossomUrl}`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Check out this cool meme ",
      });
      expect(frags[1]).toMatchObject({
        type: "blossom",
        content: blossomUrl,
      });
    });

    test("parse multiple links", () => {
      const str = "Visit https://example.com and http://test.com";
      const frags = transformText(str, []);

      expect(frags.length).toBe(4);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Visit ",
      });
      expect(frags[1]).toMatchObject({
        type: "link",
        content: "https://example.com",
      });
      expect(frags[2]).toMatchObject({
        type: "text",
        content: " and ",
      });
      expect(frags[3]).toMatchObject({
        type: "link",
        content: "http://test.com",
      });
    });
  });

  describe("media", () => {
    test("parse image link", () => {
      const str = "Check this image https://example.com/image.png";
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[1]).toMatchObject({
        type: "media",
        content: "https://example.com/image.png",
        mimeType: "image/png",
      });
    });

    test("parse jpg image", () => {
      const str = "Photo: https://example.com/photo.jpg";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "media",
        content: "https://example.com/photo.jpg",
        mimeType: "image/jpg",
      });
    });

    test("parse gif image", () => {
      const str = "Animated https://example.com/animated.gif";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "media",
        content: "https://example.com/animated.gif",
        mimeType: "image/gif",
      });
    });

    test("parse webp image", () => {
      const str = "https://example.com/image.webp";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "media",
        content: "https://example.com/image.webp",
        mimeType: "image/webp",
      });
    });

    test("parse audio file", () => {
      const str = "Listen to https://example.com/song.mp3";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "media",
        content: "https://example.com/song.mp3",
        mimeType: "audio/mp3",
      });
    });

    test("parse ogg audio", () => {
      const str = "Audio: https://example.com/sound.ogg";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "media",
        content: "https://example.com/sound.ogg",
        mimeType: "audio/ogg",
      });
    });

    test("parse wav audio", () => {
      const str = "https://example.com/audio.wav";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "media",
        content: "https://example.com/audio.wav",
        mimeType: "audio/wav",
      });
    });

    test("parse video file", () => {
      const str = "Watch this https://example.com/video.mp4";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "media",
        content: "https://example.com/video.mp4",
        mimeType: "video/mp4",
      });
    });

    test("parse webm video", () => {
      const str = "Video: https://example.com/clip.webm";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "media",
        content: "https://example.com/clip.webm",
        mimeType: "video/webm",
      });
    });

    test("parse mov video", () => {
      const str = "https://example.com/movie.mov";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "media",
        content: "https://example.com/movie.mov",
        mimeType: "video/mov",
      });
    });

    test("parse mkv video", () => {
      const str = "https://example.com/video.mkv";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "media",
        content: "https://example.com/video.mkv",
        mimeType: "video/mkv",
      });
    });
  });

  describe("hashtags", () => {
    test("parse single hashtag", () => {
      const str = "Hello #nostr";
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Hello ",
      });
      expect(frags[1]).toMatchObject({
        type: "hashtag",
        content: "nostr",
      });
    });

    test("parse multiple hashtags", () => {
      const str = "Check #bitcoin and #nostr";
      const frags = transformText(str, []);

      expect(frags.length).toBe(4);
      expect(frags[1]).toMatchObject({
        type: "hashtag",
        content: "bitcoin",
      });
      expect(frags[3]).toMatchObject({
        type: "hashtag",
        content: "nostr",
      });
    });

    test("parse hashtag at start", () => {
      const str = "#winning the day";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "hashtag",
        content: "winning",
      });
    });

    test("parse hashtag at end", () => {
      const str = "Going to the moon #bitcoin";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "hashtag",
        content: "bitcoin",
      });
    });
  });

  describe("invoices", () => {
    test("parse lightning invoice", () => {
      const str = "Pay me lnbc1000n1example";
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Pay me ",
      });
      expect(frags[1]).toMatchObject({
        type: "invoice",
        content: "lnbc1000n1example",
      });
    });

    test("parse uppercase invoice", () => {
      const str = "LNBC1000N1EXAMPLE";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "invoice",
        content: "LNBC1000N1EXAMPLE",
      });
    });

    test("parse invoice with text around it", () => {
      const str = "Send payment: lnbc500n1test here";
      const frags = transformText(str, []);

      expect(frags.length).toBe(3);
      expect(frags[1]).toMatchObject({
        type: "invoice",
        content: "lnbc500n1test",
      });
    });
  });

  describe("cashu tokens", () => {
    test("parse cashu token", () => {
      const emptyToken = `cashuA${btoa(JSON.stringify("{}"))}`;
      const str = `Redeem ${emptyToken}`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Redeem ",
      });
      expect(frags[1]).toMatchObject({
        type: "cashu",
        content: emptyToken,
      });
    });

    test("parse cashu token at start", () => {
      const emptyToken = `cashuA${btoa(JSON.stringify("{}"))}`;
      const str = `${emptyToken} is a token`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "cashu",
        content: emptyToken,
      });
      expect(frags[1]).toMatchObject({
        type: "text",
        content: " is a token",
      });
    });
  });

  describe("custom emoji", () => {
    test("parse custom emoji", () => {
      const str = "Hello :bitcoin: world";
      const tags = [["emoji", "bitcoin", "https://example.com/bitcoin.png"]];
      const frags = transformText(str, tags);

      expect(frags.length).toBe(3);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Hello ",
      });
      expect(frags[1]).toMatchObject({
        type: "custom_emoji",
        content: "https://example.com/bitcoin.png",
      });
      expect(frags[2]).toMatchObject({
        type: "text",
        content: " world",
      });
    });

    test("parse multiple custom emojis", () => {
      const str = ":fire: This is :cool:";
      const tags = [
        ["emoji", "fire", "https://example.com/fire.png"],
        ["emoji", "cool", "https://example.com/cool.png"],
      ];
      const frags = transformText(str, tags);

      expect(frags[0]).toMatchObject({
        type: "custom_emoji",
        content: "https://example.com/fire.png",
      });
      expect(frags[2]).toMatchObject({
        type: "custom_emoji",
        content: "https://example.com/cool.png",
      });
    });

    test("ignore emoji without tag", () => {
      const str = "Hello :unknown: world";
      const tags: string[][] = [];
      const frags = transformText(str, tags);

      // Should not create custom emoji fragment
      expect(frags.every(f => f.type !== "custom_emoji")).toBe(true);
    });
  });

  describe("code blocks", () => {
    test("parse code block without language", () => {
      const str = "Here is code:\n```\nconst x = 1;\n```";
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[1]).toMatchObject({
        type: "code_block",
        content: "const x = 1;\n",
      });
    });

    test("parse code block with language", () => {
      const str = "```javascript\nconst x = 1;\nconsole.log(x);\n```";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "code_block",
        content: "const x = 1;\nconsole.log(x);\n",
        language: "javascript",
      });
    });

    test("parse code block with python", () => {
      const str = "```python\ndef hello():\n    print('world')\n```";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "code_block",
        content: "def hello():\n    print('world')\n",
        language: "python",
      });
    });

    test("parse inline code in code block context", () => {
      const str = "```\ncode\n``` and some text";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "code_block",
        content: "code\n",
      });
      expect(frags[1]).toMatchObject({
        type: "text",
        content: " and some text",
      });
    });
  });

  describe("inline code", () => {
    test("parse inline code", () => {
      const str = "Use the `console.log()` function";
      const frags = transformText(str, []);

      expect(frags.length).toBe(3);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Use the ",
      });
      expect(frags[1]).toMatchObject({
        type: "inline_code",
        content: "console.log()",
      });
      expect(frags[2]).toMatchObject({
        type: "text",
        content: " function",
      });
    });

    test("parse multiple inline code", () => {
      const str = "Compare `foo` and `bar`";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "inline_code",
        content: "foo",
      });
      expect(frags[3]).toMatchObject({
        type: "inline_code",
        content: "bar",
      });
    });

    test("parse inline code at start", () => {
      const str = "`const` is a keyword";
      const frags = transformText(str, []);

      expect(frags[0]).toMatchObject({
        type: "inline_code",
        content: "const",
      });
    });

    test("parse inline code at end", () => {
      const str = "Run the command `npm install`";
      const frags = transformText(str, []);

      expect(frags[1]).toMatchObject({
        type: "inline_code",
        content: "npm install",
      });
    });
  });

  const KieranPubKey = "npub1v0lxxxxutpvrelsksy8cdhgfux9l6a42hsj2qzquu2zk7vc9qnkszrqj49";
  const EventId =
    "nevent1qqs9aulpzhm08la404nuc9g68qlx3f9xydtk6jl7hv24s0yr5694z5cppemhxue69uhkummn9ekx7mp0qy2hwumn8ghj7un9d3shjtnyv9kh2uewd9hj7q3qwmr34t36fy03m8hvgl96zl3znndyzyaqhwmwdtshwmtkg03fetaqxpqqqqqqzzckr8s";

  describe("mentions", () => {
    test("parse nostr mention with npub", () => {
      const str = `Hello @${KieranPubKey}`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Hello ",
      });
      expect(frags[1]).toMatchObject({
        type: "mention",
        content: `@${KieranPubKey}`,
      });
    });

    test("parse nostr mention with note", () => {
      const str = `See @${EventId}`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "See ",
      });
      expect(frags[1]).toMatchObject({
        type: "mention",
        content: `@${EventId}`,
      });
    });

    test("parse nostr mention with note", () => {
      const str = `See nostr:${EventId}`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "See ",
      });
      expect(frags[1]).toMatchObject({
        type: "mention",
        content: `nostr:${EventId}`,
      });
    });

    test("parse multiple mentions", () => {
      const str = `From @${KieranPubKey} to @${EventId}`;
      const frags = transformText(str, []);

      expect(frags.length).toBe(4);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "From ",
      });
      expect(frags[1]).toMatchObject({
        type: "mention",
        content: `@${KieranPubKey}`,
      });
      expect(frags[2]).toMatchObject({
        type: "text",
        content: " to ",
      });
      expect(frags[3]).toMatchObject({
        type: "mention",
        content: `@${EventId}`,
      });
    });
  });

  describe("tag references", () => {
    test("parse tag reference", () => {
      const str = "Replying to #[0]";
      const tags = [["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"]];
      const frags = transformText(str, tags);

      expect(frags.length).toBe(2);
      expect(frags[0]).toMatchObject({
        type: "text",
        content: "Replying to ",
      });
      expect(frags[1]).toMatchObject({
        type: "mention",
      });
      expect(frags[1].content).toContain("nostr:");
    });

    test("parse multiple tag references", () => {
      const str = "CC #[0] and #[1]";
      const tags = [
        ["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
        ["e", "5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36"],
      ];
      const frags = transformText(str, tags);

      expect(frags[1].type).toBe("mention");
      expect(frags[3].type).toBe("mention");
    });

    test("ignore invalid tag reference", () => {
      const str = "Invalid #[99]";
      const tags = [["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"]];
      const frags = transformText(str, tags);

      // Should not crash, should leave as text
      expect(frags.some(f => f.content === "#[99]")).toBe(true);
    });
  });

  describe("mixed content", () => {
    test("parse text with link and hashtag", () => {
      const str = "Check out https://example.com #awesome";
      const frags = transformText(str, []);

      expect(frags.length).toBe(4);
      expect(frags[0].type).toBe("text");
      expect(frags[1].type).toBe("link");
      expect(frags[2].type).toBe("text");
      expect(frags[3].type).toBe("hashtag");
    });

    test("parse complex mixed content", () => {
      const str = "Hello #nostr! Check https://example.com/image.png and use `code` here";
      const frags = transformText(str, []);

      expect(frags.length).toBe(7);
      expect(frags[1].type).toBe("hashtag");
      expect(frags[3].type).toBe("media");
      expect(frags[5].type).toBe("inline_code");
    });

    test("parse invoice with hashtag", () => {
      const str = "Pay this lnbc1000n1test #bitcoin";
      const frags = transformText(str, []);

      expect(frags[1].type).toBe("invoice");
      expect(frags[2].type).toBe("text");
      expect(frags[3].type).toBe("hashtag");
    });

    test("parse link with custom emoji", () => {
      const str = ":fire: Check https://example.com :rocket:";
      const tags = [
        ["emoji", "fire", "https://example.com/fire.png"],
        ["emoji", "rocket", "https://example.com/rocket.png"],
      ];
      const frags = transformText(str, tags);

      expect(frags[0].type).toBe("custom_emoji");
      expect(frags[2].type).toBe("link");
      expect(frags[4].type).toBe("custom_emoji");
    });

    test("parse code block with hashtags around it", () => {
      const str = "#code example:\n```javascript\nconst x = 1;\n```\n#programming";
      const frags = transformText(str, []);

      expect(frags[0].type).toBe("hashtag");
      expect(frags[2].type).toBe("code_block");
      expect(frags[4].type).toBe("hashtag");
    });
  });
});
