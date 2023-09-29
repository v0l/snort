import { NostrPrefix } from "../src/links";
import { parseNostrLink, tryParseNostrLink } from "../src/nostr-link";
import { splitByUrl } from "../src/utils";

describe("splitByUrl", () => {
  it("should split a string by URLs", () => {
    const inputStr =
      "@npub1q6mcr8t not https://example.com- sure what your stack is, https://example.com but I made a https://example.com! simple example (https://example.com) of how https://example.com/yo-yo https://example.example.com to do this https://example.com, https://example.com?q=asdf for Next.js apps hosted on Vercel https://example.com. Scarcity in money provides the incentive to create abundance in other things as there is a mechanism to reliably store value. https://i.imgur.com/rkqhjeq.png Every form of money that could be inflated by way of force or technological advancement has been. https://www.dw.com/de/amtsinhaber-mnangagwa-gewinnt-präsidentenwahl-in-simbabwe/a-66640006?maca=de-rss-de-all-1119-xml-atom and some shit.";
    const expectedOutput = [
      "@npub1q6mcr8t not ",
      "https://example.com-",
      " sure what your stack is, ",
      "https://example.com",
      " but I made a ",
      "https://example.com",
      "! simple example (",
      "https://example.com)",
      " of how ",
      "https://example.com/yo-yo",
      " ",
      "https://example.example.com",
      " to do this ",
      "https://example.com",
      ", ",
      "https://example.com?q=asdf",
      " for Next.js apps hosted on Vercel ",
      "https://example.com",
      ". Scarcity in money provides the incentive to create abundance in other things as there is a mechanism to reliably store value. ",
      "https://i.imgur.com/rkqhjeq.png",
      " Every form of money that could be inflated by way of force or technological advancement has been. ",
      "https://www.dw.com/de/amtsinhaber-mnangagwa-gewinnt-präsidentenwahl-in-simbabwe/a-66640006?maca=de-rss-de-all-1119-xml-atom",
      " and some shit.",
    ];

    expect(splitByUrl(inputStr)).toEqual(expectedOutput);
  });

  it("should parse nostr links", () => {
    const input =
      "web+nostr:npub1v0lxxxxutpvrelsksy8cdhgfux9l6a42hsj2qzquu2zk7vc9qnkszrqj49\nnostr:note1jp6d36lmquhxqn2s5n4ce00pzu2jrpkek8udav6l0y3qcdngpnxsle6ngm\nnostr:naddr1qqv8x6r0wf6x2um594cxzarg946x7ttpwajhxmmdv5pzqx78pgq53vlnzmdr8l3u38eru0n3438lnxqz0mr39wg9e5j0dfq3qvzqqqr4gu5d05rr\nnostr is cool";
    const expected = [
      "",
      "web+nostr:npub1v0lxxxxutpvrelsksy8cdhgfux9l6a42hsj2qzquu2zk7vc9qnkszrqj49",
      "\n",
      "nostr:note1jp6d36lmquhxqn2s5n4ce00pzu2jrpkek8udav6l0y3qcdngpnxsle6ngm",
      "\n",
      "nostr:naddr1qqv8x6r0wf6x2um594cxzarg946x7ttpwajhxmmdv5pzqx78pgq53vlnzmdr8l3u38eru0n3438lnxqz0mr39wg9e5j0dfq3qvzqqqr4gu5d05rr",
      "\nnostr is cool",
    ];
    expect(splitByUrl(input)).toEqual(expected);
  });

  it("should return an array with a single string if no URLs are found", () => {
    const inputStr = "This is a regular string with no URLs";
    const expectedOutput = ["This is a regular string with no URLs"];

    expect(splitByUrl(inputStr)).toEqual(expectedOutput);
  });
});

describe("tryParseNostrLink", () => {
  it("is a valid nostr link", () => {
    expect(parseNostrLink("nostr:npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg")).toMatchObject({
      id: "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e",
      type: NostrPrefix.PublicKey,
    });
    expect(parseNostrLink("web+nostr:npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg")).toMatchObject({
      id: "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e",
      type: NostrPrefix.PublicKey,
    });
    expect(parseNostrLink("nostr:note15449edq4qa5wzgqvh8td0q0dp6hwtes4pknsrm7eygeenhlj99xsq94wu9")).toMatchObject({
      id: "a56a5cb4150768e1200cb9d6d781ed0eaee5e6150da701efd9223399dff2294d",
      type: NostrPrefix.Note,
    });
    expect(
      parseNostrLink(
        "nostr:nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p",
      ),
    ).toMatchObject({
      id: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
      type: NostrPrefix.Profile,
      relays: ["wss://r.x.com", "wss://djbas.sadkb.com"],
    });
    expect(parseNostrLink("nostr:nevent1qqs226juks2sw68pyqxtn4khs8ksath9uc2smfcpalvjyvuemlezjngrd87dq")).toMatchObject({
      id: "a56a5cb4150768e1200cb9d6d781ed0eaee5e6150da701efd9223399dff2294d",
      type: NostrPrefix.Event,
    });
    expect(
      parseNostrLink(
        "nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu",
      ),
    ).toMatchObject({
      id: "ipsum",
      type: NostrPrefix.Address,
      relays: ["wss://relay.nostr.org"],
      author: "a695f6b60119d9521934a691347d9f78e8770b56da16bb255ee286ddf9fda919",
      kind: 30023,
    });
  });
  test.each(["nostr:npub", "web+nostr:npub", "nostr:nevent1xxx"])("should return false for invalid nostr links", lb => {
    expect(tryParseNostrLink(lb)).toBeUndefined();
  });
});
