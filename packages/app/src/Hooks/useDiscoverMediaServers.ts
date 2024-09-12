import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useDiscoverMediaServers() {
  const sub = useMemo(() => {
    const rb = new RequestBuilder("media-servers-all");
    rb.withFilter().kinds([EventKind.StorageServerList]);
    return rb;
  }, []);

  const data = useRequestBuilder(sub);

  return data.reduce(
    (acc, v) => {
      const servers = removeUndefined(v.tags.filter(a => a[0] === "server").map(a => sanitizeRelayUrl(a[1])));
      for (const server of servers) {
        acc[server] ??= 0;
        acc[server]++;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
}
