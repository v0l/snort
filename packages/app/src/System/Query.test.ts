import { Connection } from "@snort/nostr";
import { describe, expect } from "@jest/globals";
import { Query, QueryBase } from "./Query";
import { getRandomValues } from "crypto";
import { FlatNoteStore } from "./NoteCollection";

window.crypto = {} as any;
window.crypto.getRandomValues = getRandomValues as any;

describe("query", () => {
  test("progress", () => {
    const q = new Query("test", new FlatNoteStore());
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

    q.sendToRelay(c1, {
      id: "test",
      filters: [
        {
          kinds: [1],
          authors: ["test"],
        },
      ],
    });
    q.sendToRelay(c2);
    q.sendToRelay(c3);

    expect(q.progress).toBe(0);
    q.eose(q.id, c1);
    expect(q.progress).toBe(1 / 3);
    q.eose(q.id, c1);
    expect(q.progress).toBe(1 / 3);
    q.eose(q.id, c2);
    expect(q.progress).toBe(2 / 3);
    q.eose(q.id, c3);
    expect(q.progress).toBe(1);

    const qs = {
      id: "test-1",
      filters: [
        {
          kinds: [1],
          authors: ["test-sub"],
        },
      ],
    } as QueryBase;
    q.sendToRelay(c1, qs);

    expect(q.progress).toBe(3 / 4);
    q.eose(qs.id, c1);
    expect(q.progress).toBe(1);
    q.sendToRelay(c2, qs);
    expect(q.progress).toBe(4 / 5);
  });
});
