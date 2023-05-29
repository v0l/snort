import { RawReqFilter } from "@snort/nostr";
import { mergeSimilar } from "./RequestMerger";

describe("RequestMerger", () => {
  it("should simple merge authors", () => {
    const a = {
      authors: ["a"],
    } as RawReqFilter;
    const b = {
      authors: ["b"],
    } as RawReqFilter;

    const merged = mergeSimilar([a, b]);
    expect(merged).toMatchObject([
      {
        authors: ["a", "b"],
      },
    ]);
  });

  it("should append non-mergable filters", () => {
    const a = {
      authors: ["a"],
    } as RawReqFilter;
    const b = {
      authors: ["b"],
    } as RawReqFilter;
    const c = {
      limit: 5,
      authors: ["a"],
    };

    const merged = mergeSimilar([a, b, c]);
    expect(merged).toMatchObject([
      {
        authors: ["a", "b"],
      },
      {
        limit: 5,
        authors: ["a"],
      },
    ]);
  });
});
