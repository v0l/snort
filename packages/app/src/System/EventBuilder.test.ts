/*import { EventKind } from "@snort/nostr";
import { EventBuilder } from "./EventBuilder";

const PubKey = "test-key";

describe("EventBuilder", () => {
  it("should not add duplicate tags", () => {
    const eb = new EventBuilder();
    eb.pubKey(PubKey);
    eb.kind(EventKind.TextNote);

    eb.tag(["p", PubKey]);
    eb.tag(["p", PubKey]);
    const out = eb.build();
    expect(out.tags.length).toBe(1);
  });
});
*/
