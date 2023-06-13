import { ReqFilter } from "../src";
import { describe, expect } from "@jest/globals";
import { diffFilters } from "../src/RequestSplitter";
import { expandFilter } from "../src/RequestExpander";

describe("RequestSplitter", () => {
  test("single filter add value", () => {
    const a: Array<ReqFilter> = [{ kinds: [0], authors: ["a"] }];
    const b: Array<ReqFilter> = [{ kinds: [0], authors: ["a", "b"] }];
    const diff = diffFilters(a.flatMap(expandFilter), b.flatMap(expandFilter), true);
    expect(diff).toEqual({
      added: [{ kinds: [0], authors: ["b"] }],
      removed: [],
      changed: true,
    });
  });
  test("single filter remove value", () => {
    const a: Array<ReqFilter> = [{ kinds: [0], authors: ["a"] }];
    const b: Array<ReqFilter> = [{ kinds: [0], authors: ["b"] }];
    const diff = diffFilters(a.flatMap(expandFilter), b.flatMap(expandFilter), true);
    expect(diff).toEqual({
      added: [{ kinds: [0], authors: ["b"] }],
      removed: [{ kinds: [0], authors: ["a"] }],
      changed: true,
    });
  });
  test("single filter change critical key", () => {
    const a: Array<ReqFilter> = [{ kinds: [0], authors: ["a"], since: 100 }];
    const b: Array<ReqFilter> = [{ kinds: [0], authors: ["a", "b"], since: 101 }];
    const diff = diffFilters(a.flatMap(expandFilter), b.flatMap(expandFilter), true);
    expect(diff).toEqual({
      added: [{ kinds: [0], authors: ["a", "b"], since: 101 }],
      removed: [{ kinds: [0], authors: ["a"], since: 100 }],
      changed: true,
    });
  });
  test("multiple filter add value", () => {
    const a: Array<ReqFilter> = [
      { kinds: [0], authors: ["a"] },
      { kinds: [69], authors: ["a"] },
    ];
    const b: Array<ReqFilter> = [
      { kinds: [0], authors: ["a", "b"] },
      { kinds: [69], authors: ["a", "c"] },
    ];
    const diff = diffFilters(a.flatMap(expandFilter), b.flatMap(expandFilter), true);
    expect(diff).toEqual({
      added: [
        { kinds: [0], authors: ["b"] },
        { kinds: [69], authors: ["c"] },
      ],
      removed: [],
      changed: true,
    });
  });
  test("multiple filter remove value", () => {
    const a: Array<ReqFilter> = [
      { kinds: [0], authors: ["a"] },
      { kinds: [69], authors: ["a"] },
    ];
    const b: Array<ReqFilter> = [
      { kinds: [0], authors: ["b"] },
      { kinds: [69], authors: ["c"] },
    ];
    const diff = diffFilters(a.flatMap(expandFilter), b.flatMap(expandFilter), true);
    expect(diff).toEqual({
      added: [
        { kinds: [0], authors: ["b"] },
        { kinds: [69], authors: ["c"] },
      ],
      removed: [{ kinds: [0, 69], authors: ["a"] }],
      changed: true,
    });
  });
  test("add filter", () => {
    const a: Array<ReqFilter> = [{ kinds: [0], authors: ["a"] }];
    const b: Array<ReqFilter> = [
      { kinds: [0], authors: ["a"] },
      { kinds: [69], authors: ["c"] },
    ];
    const diff = diffFilters(a.flatMap(expandFilter), b.flatMap(expandFilter), true);
    expect(diff).toEqual({
      added: [{ kinds: [69], authors: ["c"] }],
      removed: [],
      changed: true,
    });
  });
});
