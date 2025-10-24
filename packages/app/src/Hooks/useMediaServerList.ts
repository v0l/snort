import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { EventKind, UnknownTag } from "@snort/system";
import { useMemo } from "react";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

export const DefaultMediaServers = [
  new UnknownTag(["server", "https://nostr.download/"]),
  new UnknownTag(["server", "https://blossom.band/"]),
  new UnknownTag(["server", "https://nostrcheck.me/"]),
  new UnknownTag(["server", "https://blossom.primal.net/"]),
];

export function useMediaServerList() {
  const { publisher } = useEventPublisher();
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));

  let servers = state?.getList(EventKind.BlossomServerList) ?? [];
  if (servers.length === 0) {
    servers = DefaultMediaServers;
  }

  return useMemo(
    () => ({
      servers: removeUndefined(servers.map(a => a.toEventTag()))
        .filter(a => a[0] === "server")
        .map(a => a[1]),
      addServer: async (s: string) => {
        if (!publisher) return;

        const u = sanitizeRelayUrl(s);
        if (!u) return;
        state?.addToList(EventKind.BlossomServerList, new UnknownTag(["server", u]), true);
      },
      removeServer: async (s: string) => {
        const u = sanitizeRelayUrl(s);
        if (!u) return;
        state?.removeFromList(EventKind.BlossomServerList, new UnknownTag(["server", u]), true);
      },
    }),
    [servers],
  );
}
