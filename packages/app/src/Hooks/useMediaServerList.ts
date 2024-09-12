import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { EventKind, UnknownTag } from "@snort/system";
import { useMemo } from "react";

import { Nip96Uploader } from "@/Utils/Upload/Nip96";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

export const DefaultMediaServers = [
  //"https://media.zap.stream",
  new UnknownTag(["server", "https://nostr.build/"]),
  new UnknownTag(["server", "https://nostrcheck.me/"]),
  new UnknownTag(["server", "https://files.v0l.io/"]),
];

export function useMediaServerList() {
  const { publisher } = useEventPublisher();
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }));

  let servers = state?.getList(EventKind.StorageServerList) ?? [];
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
        const server = new Nip96Uploader(u, publisher);
        await server.loadInfo();
        await state?.addToList(EventKind.StorageServerList, new UnknownTag(["server", u]), true);
      },
      removeServer: async (s: string) => {
        const u = sanitizeRelayUrl(s);
        if (!u) return;
        await state?.removeFromList(EventKind.StorageServerList, new UnknownTag(["server", u]), true);
      },
    }),
    [servers],
  );
}
