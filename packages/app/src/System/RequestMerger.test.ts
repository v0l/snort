import { ReqFilter } from "System";
import { filterIncludes, flatMerge, mergeSimilar, simpleMerge } from "./RequestMerger";
import { FlatReqFilter, expandFilter } from "./RequestExpander";
import { distance } from "./Util";

describe("RequestMerger", () => {
  it("should simple merge authors", () => {
    const a = {
      authors: ["a"],
    } as ReqFilter;
    const b = {
      authors: ["b"],
    } as ReqFilter;

    const merged = mergeSimilar([a, b]);
    expect(merged).toEqual([
      {
        authors: ["a", "b"],
      },
    ]);
  });

  it("should append non-mergable filters", () => {
    const a = {
      authors: ["a"],
    } as ReqFilter;
    const b = {
      authors: ["b"],
    } as ReqFilter;
    const c = {
      limit: 5,
      authors: ["a"],
    };

    const merged = mergeSimilar([a, b, c]);
    expect(merged).toEqual([
      {
        authors: ["a", "b"],
      },
      {
        limit: 5,
        authors: ["a"],
      },
    ]);
  });

  it("filterIncludes", () => {
    const bigger = {
      authors: ["a", "b", "c"],
      since: 99,
    } as ReqFilter;
    const smaller = {
      authors: ["c"],
      since: 100,
    } as ReqFilter;
    expect(filterIncludes(bigger, smaller)).toBe(true);
  });

  it("simpleMerge", () => {
    const a = {
      authors: ["a", "b", "c"],
      since: 99,
    } as ReqFilter;
    const b = {
      authors: ["c", "d", "e"],
      since: 100,
    } as ReqFilter;
    expect(simpleMerge([a, b])).toEqual({
      authors: ["a", "b", "c", "d", "e"],
      since: 100,
    });
  });
});

describe("flatMerge", () => {
  it("should flat merge simple", () => {
    const input = [
      { ids: 0, authors: "a" },
      { ids: 0, authors: "b" },
      { kinds: 1 },
      { kinds: 2 },
      { ids: 0, authors: "c" },
      { authors: "c", kinds: 1 },
      { authors: "c", limit: 100 },
      { ids: 1, authors: "c" },
    ] as Array<FlatReqFilter>;
    const output = [
      { ids: [0], authors: ["a", "b", "c"] },
      { kinds: [1, 2] },
      { authors: ["c"], kinds: [1] },
      { authors: ["c"], limit: 100 },
      { ids: [1], authors: ["c"] },
    ] as Array<ReqFilter>;

    expect(flatMerge(input)).toEqual(output);
  });

  it("should expand and flat merge complex same", () => {
    const input = [
      { kinds: [1, 6969, 6], authors: ["kieran", "snort", "c", "d", "e"], since: 1, until: 100 },
      { kinds: [4], authors: ["kieran"] },
      { kinds: [4], "#p": ["kieran"] },
      { kinds: [1000], authors: ["snort"], "#p": ["kieran"] },
    ] as Array<ReqFilter>;

    const dut = flatMerge(input.flatMap(expandFilter).sort(() => (Math.random() > 0.5 ? 1 : -1)));
    expect(dut.every(a => input.some(b => distance(b, a) === 0))).toEqual(true);
  });
});
