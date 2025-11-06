import { sha256 } from "@snort/shared";
import { RequestBuilder, EventKind, NostrLink } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useBlossomServers(authors?: Array<string> | Array<NostrLink>) {
  const subServerLists = useMemo(() => {
    const rb = new RequestBuilder(`blossom-lists:${sha256(authors?.join(",") ?? "")}`);
    if (authors && authors.length > 0) {
      const authorIds =
        authors[0] instanceof NostrLink ? authors.map(a => (a as NostrLink).id) : (authors as Array<string>);
      rb.withFilter().authors(authorIds).kinds([EventKind.BlossomServerList]);
    }
    return rb;
  }, [authors]);

  const data = useRequestBuilder(subServerLists);

  return Object.fromEntries(
    data.map(a => {
      return [a.pubkey, a.tags.filter(a => a[0] === "server").map(a => a[1])];
    }),
  ) as Record<string, Array<string>>;
}
