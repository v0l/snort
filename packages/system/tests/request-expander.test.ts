import { expandFilter } from "../src/query-optimizer/request-expander";

describe("RequestExpander", () => {
  test("expand filter", () => {
    const a = {
      authors: ["a", "b", "c"],
      kinds: [1, 2, 3],
      ids: ["x", "y"],
      "#p": ["a"],
      since: 99,
      limit: 10,
    };
    expect(expandFilter(a)).toMatchObject([
      { authors: "a", kinds: 1, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "a", kinds: 1, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "a", kinds: 2, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "a", kinds: 2, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "a", kinds: 3, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "a", kinds: 3, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "b", kinds: 1, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "b", kinds: 1, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "b", kinds: 2, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "b", kinds: 2, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "b", kinds: 3, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "b", kinds: 3, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "c", kinds: 1, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "c", kinds: 1, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "c", kinds: 2, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "c", kinds: 2, ids: "y", "#p": "a", since: 99, limit: 10 },
      { authors: "c", kinds: 3, ids: "x", "#p": "a", since: 99, limit: 10 },
      { authors: "c", kinds: 3, ids: "y", "#p": "a", since: 99, limit: 10 },
    ]);
  });
});
