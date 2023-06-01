import { RawReqFilter } from "System";
import { filterIncludes, mergeSimilar, simpleMerge } from "./RequestMerger";

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

  it("filterIncludes", () => {
    const bigger = {
      authors: ["a", "b", "c"],
      since: 99,
    } as RawReqFilter;
    const smaller = {
      authors: ["c"],
      since: 100,
    } as RawReqFilter;
    expect(filterIncludes(bigger, smaller)).toBe(true);
  });

  it("simpleMerge", () => {
    const a = {
      authors: ["a", "b", "c"],
      since: 99,
    } as RawReqFilter;
    const b = {
      authors: ["c", "d", "e"],
      since: 100,
    } as RawReqFilter;
    expect(simpleMerge([a, b])).toEqual({
      authors: ["a", "b", "c", "d", "e"],
      since: 100,
    });
  });
});
