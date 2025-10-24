import { RequestBuilder } from "../src/request-builder";
import { describe, expect, test } from "bun:test";
import { bytesToHex } from "@noble/curves/abstract/utils";
import { FeedCache, unixNow, unixNowMs } from "@snort/shared";
import { NostrSystem, UsersRelays } from "../src";

const DummyCache = {
  getFromCache: (pk?: string) => {
    if (!pk) return undefined;

    return {
      pubkey: pk,
      created_at: unixNow(),
      relays: [
        {
          url: `wss://${pk}.com/`,
          settings: {
            read: true,
            write: true,
          },
        },
      ],
    };
  },
  update: () => {
    return Promise.resolve<"new" | "updated" | "refresh" | "no_change">("new");
  },
  buffer: () => {
    return Promise.resolve<Array<string>>([]);
  },
  bulkSet: () => {
    return Promise.resolve();
  },
} as unknown as FeedCache<UsersRelays>;

const System = new NostrSystem({
  relayCache: DummyCache,
});

describe("RequestBuilder", () => {
  describe("basic", () => {
    test("empty filter", () => {
      const b = new RequestBuilder("test");
      b.withFilter();
      expect(b.buildRaw()).toEqual([{}]);
    });
    test("only kind", () => {
      const b = new RequestBuilder("test");
      b.withFilter().kinds([0]);
      expect(b.buildRaw()).toMatchObject([{ kinds: [0] }]);
    });
    test("empty authors", () => {
      const b = new RequestBuilder("test");
      b.withFilter().authors([]);
      expect(b.buildRaw()).toMatchObject([{ authors: [] }]);
    });
    test("search", () => {
      const b = new RequestBuilder("test");
      b.withFilter().kinds([1]).search("test-search");
      expect(b.buildRaw()).toMatchObject([{ kinds: [1], search: "test-search" }]);
    });
  });
});
