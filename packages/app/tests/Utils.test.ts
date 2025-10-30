import { magnetURIDecode, getRelayName } from "../src/Utils";
import { describe, test, expect } from "bun:test";

describe("magnet", () => {
  test("should parse magnet link", () => {
    const book =
      "magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&xt=urn:btmh:1220d2474e86c95b19b8bcfdb92bc12c9d44667cfa36d2474e86c95b19b8bcfdb92b&dn=Leaves+of+Grass+by+Walt+Whitman.epub&tr=udp%3A%2F%2Ftracker.example4.com%3A80&tr=udp%3A%2F%2Ftracker.example5.com%3A80&tr=udp%3A%2F%2Ftracker.example3.com%3A6969&tr=udp%3A%2F%2Ftracker.example2.com%3A80&tr=udp%3A%2F%2Ftracker.example1.com%3A1337";
    const output = magnetURIDecode(book);
    expect(output).not.toBeUndefined();
    expect(output!.dn).toEqual("Leaves of Grass by Walt Whitman.epub");
    expect(output!.infoHash).toEqual("d2474e86c95b19b8bcfdb92bc12c9d44667cfa36");
    expect(output!.tr).toEqual([
      "udp://tracker.example4.com:80",
      "udp://tracker.example5.com:80",
      "udp://tracker.example3.com:6969",
      "udp://tracker.example2.com:80",
      "udp://tracker.example1.com:1337",
    ]);
  });
});

describe("getRelayName", () => {
  test("should return relay name", () => {
    const url = "wss://relay.snort.social/";
    const output = getRelayName(url);
    expect(output).toEqual("relay.snort.social");
  });
  test("should return relay name with search property", () => {
    const url = "wss://relay.example1.com/?lang=en";
    const output = getRelayName(url);
    expect(output).toEqual("relay.example1.com?lang=en");
  });
  test("should return relay name without pathname", () => {
    const url =
      "wss://relay.example2.com/npub1sn0rtcjcf543gj4wsg7fa59s700d5ztys5ctj0g69g2x6802npjqhjjtws?broadcast=true";
    const output = getRelayName(url);
    expect(output).toEqual("relay.example2.com?broadcast=true");
  });
});
