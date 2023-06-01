import { distance } from "./Util";

describe("distance", () => {
  it("should have 0 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "a",
    };
    expect(distance(a, b)).toEqual(0);
  });
  it("should have 1 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "b",
    };
    expect(distance(a, b)).toEqual(1);
  });
  it("should have 10 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "a",
      kinds: 1,
    };
    expect(distance(a, b)).toEqual(10);
  });
  it("should have 11 distance", () => {
    const a = {
      ids: "a",
    };
    const b = {
      ids: "b",
      kinds: 1,
    };
    expect(distance(a, b)).toEqual(11);
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
    expect(distance(a, b)).toEqual(1);
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
    expect(distance(a, b)).toEqual(1);
  });
});
