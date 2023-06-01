import { eventMatchesFilter } from "./RequestMatcher";

describe("RequestMatcher", () => {
  it("should match simple filter", () => {
    const ev = {
      id: "test",
      kind: 1,
      pubkey: "pubkey",
      created_at: 99,
      tags: [],
      content: "test",
      sig: "",
    };
    const filter = {
      ids: ["test"],
      authors: ["pubkey", "other"],
      kinds: [1, 2, 3],
      since: 1,
      before: 100,
    };
    expect(eventMatchesFilter(ev, filter)).toBe(true);
  });
});
