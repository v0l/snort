import { Connection } from "../src";
import { describe, expect } from "@jest/globals";
import { Query } from "../src/Query";
import { getRandomValues } from "crypto";
import { FlatNoteStore } from "../src/NoteCollection";
import { RequestStrategy } from "../src/RequestBuilder";

window.crypto = {} as any;
window.crypto.getRandomValues = getRandomValues as any;

describe("query", () => {
  test("progress", () => {
    const q = new Query("test", "", new FlatNoteStore());
    const opt = {
      read: true,
      write: true,
    };
    const c1 = new Connection("wss://one.com", opt);
    c1.Down = false;
    const c2 = new Connection("wss://two.com", opt);
    c2.Down = false;
    const c3 = new Connection("wss://three.com", opt);
    c3.Down = false;

    const f = {
      relay: "",
      strategy: RequestStrategy.DefaultRelays,
      filters: [
        {
          kinds: [1],
          authors: ["test"],
        },
      ],
    };
    const qt1 = q.sendToRelay(c1, f);
    const qt2 = q.sendToRelay(c2, f);
    const qt3 = q.sendToRelay(c3, f);

    expect(q.progress).toBe(0);
    q.eose(qt1!.id, c1);
    expect(q.progress).toBe(1 / 3);
    q.eose(qt1!.id, c1);
    expect(q.progress).toBe(1 / 3);
    q.eose(qt2!.id, c2);
    expect(q.progress).toBe(2 / 3);
    q.eose(qt3!.id, c3);
    expect(q.progress).toBe(1);

    const qs = {
      relay: "",
      strategy: RequestStrategy.DefaultRelays,
      filters: [
        {
          kinds: [1],
          authors: ["test-sub"],
        },
      ],
    };
    const qt = q.sendToRelay(c1, qs);

    expect(q.progress).toBe(3 / 4);
    q.eose(qt!.id, c1);
    expect(q.progress).toBe(1);
    q.sendToRelay(c2, qs);
    expect(q.progress).toBe(4 / 5);
  });

  it("should merge all sub-query filters", () => {
    const q = new Query("test", "", new FlatNoteStore());
    const c0 = new Connection("wss://test.com", { read: true, write: true });
    q.sendToRelay(c0, {
      filters: [
        {
          authors: ["a"],
          kinds: [1],
        },
      ],
      relay: "",
      strategy: RequestStrategy.DefaultRelays,
    });
    q.sendToRelay(c0, {
      filters: [
        {
          authors: ["b"],
          kinds: [1, 2],
        },
      ],
      relay: "",
      strategy: RequestStrategy.DefaultRelays,
    });
    q.sendToRelay(c0, {
      filters: [
        {
          authors: ["c"],
          kinds: [2],
        },
      ],
      relay: "",
      strategy: RequestStrategy.DefaultRelays,
    });

    expect(q.filters).toEqual([
      {
        authors: ["a", "b"],
        kinds: [1],
      },
      {
        authors: ["b", "c"],
        kinds: [2],
      },
    ]);
  });
});
