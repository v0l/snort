import { ReqFilter } from "../src";
import { canMergeFilters, filterIncludes, flatMerge, mergeSimilar, simpleMerge } from "../src/RequestMerger";
import { FlatReqFilter, expandFilter } from "../src/RequestExpander";

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
    expect(dut.every(a => input.some(b => canMergeFilters(b, a) === false))).toEqual(true);
  });
});

describe('canMerge', () => {
  it("should have 0 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "a",
    };
    expect(canMergeFilters(a, b)).toEqual(true);
  });
  it("should have 1 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "b",
    };
    expect(canMergeFilters(a, b)).toEqual(true);
  });
  it("should have 10 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "a",
      kinds: 1,
    };
    expect(canMergeFilters(a, b)).toEqual(false);
  });
  it("should have 11 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "b",
      kinds: 1,
    };
    expect(canMergeFilters(a, b)).toEqual(false);
  });
  it("should have 1 distance, arrays", () => {
    const a = {
      since: 1,
      until: 100,
      kinds: [1],
      authors: ["kieran", "snort", "c", "d", "e"],
    };
    const b = {
      since: 1,
      until: 100,
      kinds: [6969],
      authors: ["kieran", "snort", "c", "d", "e"],
    };
    expect(canMergeFilters(a, b)).toEqual(true);
  });
  it("should have 1 distance, array change extra", () => {
    const a = {
      since: 1,
      until: 100,
      kinds: [1],
      authors: ["f", "kieran", "snort", "c", "d"],
    };
    const b = {
      since: 1,
      until: 100,
      kinds: [1],
      authors: ["kieran", "snort", "c", "d", "e"],
    };
    expect(canMergeFilters(a, b)).toEqual(true);
  });
})
