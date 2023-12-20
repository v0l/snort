import { splitAllByWriteRelays } from "../src/outbox-model";

describe("OutboxModel", () => {
  it("should not output empty", () => {
    const Relays = {
      getFromCache: (pk?: string) => {
        if (pk) {
          return {
            pubkey: pk,
            created: 0,
            loaded: 0,
            relays: [],
          };
        }
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
    };
    const a = [
      {
        until: 1686651693,
        limit: 200,
        kinds: [1, 6, 6969],
        authors: ["3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d"],
      },
    ];

    const output = splitAllByWriteRelays(Relays, a);
    expect(output).toEqual([
      {
        relay: "",
        filters: a,
      },
    ]);
  });
});
