import { splitByUrl, magnetURIDecode } from "./Util";

describe("splitByUrl", () => {
  it("should split a string by URLs", () => {
    const inputStr =
      "@npub1q6mcr8t not https://example.com- sure what your stack is, https://example.com but I made a https://example.com! simple example (https://example.com) of how https://example.com/yo-yo https://example.example.com to do this https://example.com, https://example.com?q=asdf for Next.js apps hosted on Vercel https://example.com. Scarcity in money provides the incentive to create abundance in other things as there is a mechanism to reliably store value. https://i.imgur.com/rkqhjeq.png Every form of money that could be inflated by way of force or technological advancement has been.";
    const expectedOutput = [
      "@npub1q6mcr8t not ",
      "https://example.com-",
      " sure what your stack is, ",
      "https://example.com",
      " but I made a ",
      "https://example.com",
      "! simple example (",
      "https://example.com",
      ") of how ",
      "https://example.com/yo-yo",
      " ",
      "https://example.example.com",
      " to do this ",
      "https://example.com",
      ", ",
      "https://example.com?q=asdf",
      " for Next.js apps hosted on Vercel ",
      "https://example.com",
      ". Scarcity in money provides the incentive to create abundance in other things as there is a mechanism to reliably store value. ",
      "https://i.imgur.com/rkqhjeq.png",
      " Every form of money that could be inflated by way of force or technological advancement has been.",
    ];

    expect(splitByUrl(inputStr)).toEqual(expectedOutput);
  });

  it("should return an array with a single string if no URLs are found", () => {
    const inputStr = "This is a regular string with no URLs";
    const expectedOutput = ["This is a regular string with no URLs"];

    expect(splitByUrl(inputStr)).toEqual(expectedOutput);
  });
});

describe("magnet", () => {
  it("should parse magnet link", () => {
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
