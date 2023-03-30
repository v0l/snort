import { Connection, RelaySettings } from "@snort/nostr";
import { unixNow } from "Util";
import { Query } from "./Query";

describe("query", () => {
  test("progress", () => {
    const q = new Query("test", {
      filters: [
        {
          kinds: [1],
          authors: ["test"],
        },
      ],
      started: unixNow(),
    });
    const opt = {
      read: true,
      write: true,
    } as RelaySettings;
    const c1 = new Connection("wss://one.com", opt);
    c1.Down = false;
    const c2 = new Connection("wss://two.com", opt);
    c2.Down = false;
    const c3 = new Connection("wss://three.com", opt);
    c3.Down = false;

    q.sendToRelay(c1);
    q.sendToRelay(c2);
    q.sendToRelay(c3);

    expect(q.progress).toBe(0);
    q.eose(q.id, c1.Address);
    expect(q.progress).toBe(1 / 3);
    q.eose(q.id, c1.Address);
    expect(q.progress).toBe(1 / 3);
    q.eose(q.id, c2.Address);
    expect(q.progress).toBe(2 / 3);
    q.eose(q.id, c3.Address);
    expect(q.progress).toBe(1);

    const qs = new Query("test-1", {
      filters: [
        {
          kinds: [1],
          authors: ["test-sub"],
        },
      ],
      started: unixNow(),
    });
    q.subQueries.push(qs);
    qs.sendToRelay(c1);

    expect(q.progress).toBe(0.5);
    q.eose(qs.id, c1.Address);
    expect(q.progress).toBe(1);
    qs.sendToRelay(c2);
    // 1 + 0.5 (1/2 sent sub query)
    expect(q.progress).toBe(1.5 / 2);
  });
});
