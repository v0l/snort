import { NostrPrefix } from "../src/links";
import { parseNostrLink, tryParseNostrLink } from "../src/nostr-link";

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
        "nostr:nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p"
      )
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
        "nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu"
      )
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
