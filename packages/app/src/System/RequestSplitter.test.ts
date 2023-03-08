import { RawReqFilter } from "@snort/nostr";
import { diffFilters } from "./RequestSplitter";

describe("RequestSplitter", () => {
  test("single filter add value", () => {
    const a: Array<RawReqFilter> = [{ kinds: [0], authors: ["a"] }];
    const b: Array<RawReqFilter> = [{ kinds: [0], authors: ["a", "b"] }];
    const diff = diffFilters(a, b);
    expect(diff).toEqual([{ kinds: [0], authors: ["b"] }]);
  });
  test("single filter remove value", () => {
    const a: Array<RawReqFilter> = [{ kinds: [0], authors: ["a"] }];
    const b: Array<RawReqFilter> = [{ kinds: [0], authors: ["b"] }];
    const diff = diffFilters(a, b);
    expect(diff).toEqual([{ kinds: [0], authors: ["b"] }]);
  });
  test("single filter change critical key", () => {
    const a: Array<RawReqFilter> = [{ kinds: [0], authors: ["a"], since: 100 }];
    const b: Array<RawReqFilter> = [{ kinds: [0], authors: ["a", "b"], since: 101 }];
    const diff = diffFilters(a, b);
    expect(diff).toEqual([{ kinds: [0], authors: ["a", "b"], since: 101 }]);
  });
  test("multiple filter add value", () => {
    const a: Array<RawReqFilter> = [
      { kinds: [0], authors: ["a"] },
      { kinds: [69], authors: ["a"] },
    ];
    const b: Array<RawReqFilter> = [
      { kinds: [0], authors: ["a", "b"] },
      { kinds: [69], authors: ["a", "c"] },
    ];
    const diff = diffFilters(a, b);
    expect(diff).toEqual([
      { kinds: [0], authors: ["b"] },
      { kinds: [69], authors: ["c"] },
    ]);
  });
  test("multiple filter remove value", () => {
    const a: Array<RawReqFilter> = [
      { kinds: [0], authors: ["a"] },
      { kinds: [69], authors: ["a"] },
    ];
    const b: Array<RawReqFilter> = [
      { kinds: [0], authors: ["b"] },
      { kinds: [69], authors: ["c"] },
    ];
    const diff = diffFilters(a, b);
    expect(diff).toEqual([
      { kinds: [0], authors: ["b"] },
      { kinds: [69], authors: ["c"] },
    ]);
  });
  test("add filter", () => {
    const a: Array<RawReqFilter> = [{ kinds: [0], authors: ["a"] }];
    const b: Array<RawReqFilter> = [
      { kinds: [0], authors: ["a"] },
      { kinds: [69], authors: ["c"] },
    ];
    const diff = diffFilters(a, b);
    expect(diff).toEqual([
      { kinds: [0], authors: ["a"] },
      { kinds: [69], authors: ["c"] },
    ]);
  });
});
