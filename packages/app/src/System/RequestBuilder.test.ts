import { RelayCache } from "./GossipModel";
import { RequestBuilder } from "./RequestBuilder";
import { describe, expect } from "@jest/globals";

describe("RequestBuilder", () => {
  const relayCache = {
    get: () => {
      return undefined;
    },
  } as RelayCache;

  describe("basic", () => {
    test("empty filter", () => {
      const b = new RequestBuilder("test");
      b.withFilter();
      expect(b.build(relayCache)).toEqual([{}]);
    });
    test("only kind", () => {
      const b = new RequestBuilder("test");
      b.withFilter().kinds([0]);
      expect(b.build(relayCache)).toEqual([{ kinds: [0] }]);
    });
    test("empty authors", () => {
      const b = new RequestBuilder("test");
      b.withFilter().authors([]);
      expect(b.build(relayCache)).toEqual([{ authors: [] }]);
    });
    test("authors/kinds/ids", () => {
      const authors = ["a1", "a2"];
      const kinds = [0, 1, 2, 3];
      const ids = ["id1", "id2", "id3"];
      const b = new RequestBuilder("test");
      b.withFilter().authors(authors).kinds(kinds).ids(ids);
      expect(b.build(relayCache)).toEqual([{ ids, authors, kinds }]);
    });
    test("authors and kinds, duplicates removed", () => {
      const authors = ["a1", "a2"];
      const kinds = [0, 1, 2, 3];
      const ids = ["id1", "id2", "id3"];
      const b = new RequestBuilder("test");
      b.withFilter().ids(ids).authors(authors).kinds(kinds).ids(ids).authors(authors).kinds(kinds);
      expect(b.build(relayCache)).toEqual([{ ids, authors, kinds }]);
    });
    test("search", () => {
      const b = new RequestBuilder("test");
      b.withFilter().kinds([1]).search("test-search");
      expect(b.build(relayCache)).toEqual([{ kinds: [1], search: "test-search" }]);
    });
    test("timeline", () => {
      const authors = ["a1", "a2"];
      const kinds = [0, 1, 2, 3];
      const until = 10;
      const since = 5;
      const b = new RequestBuilder("test");
      b.withFilter().kinds(kinds).authors(authors).since(since).until(until);
      expect(b.build(relayCache)).toEqual([{ kinds, authors, until, since }]);
    });
    test("multi-filter timeline", () => {
      const authors = ["a1", "a2"];
      const kinds = [0, 1, 2, 3];
      const until = 10;
      const since = 5;
      const b = new RequestBuilder("test");
      b.withFilter().kinds(kinds).authors(authors).since(since).until(until);
      b.withFilter().kinds(kinds).authors(authors).since(since).until(until);
      expect(b.build(relayCache)).toEqual([
        { kinds, authors, until, since },
        { kinds, authors, until, since },
      ]);
    });
  });
});
