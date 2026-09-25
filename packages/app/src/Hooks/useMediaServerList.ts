import { removeUndefined, sanitizeRelayUrl } from "@snort/shared"
import { EventKind, UnknownTag } from "@snort/system"
import { useMemo } from "react"

import useEventPublisher from "./useEventPublisher"
import useLogin from "./useLogin"

export const DefaultMediaServers = [
  new UnknownTag(["server", "https://nostr.download/"]),
  new UnknownTag(["server", "https://blossom.band/"]),
  new UnknownTag(["server", "https://nostrcheck.me/"]),
  new UnknownTag(["server", "https://blossom.primal.net/"]),
]

export function useMediaServerList() {
  const { publisher } = useEventPublisher()
  const { state } = useLogin(s => ({ v: s.state.version, state: s.state }))

  let list = state?.getList(EventKind.BlossomServerList) ?? []
  if (list.length === 0) {
    list = DefaultMediaServers
  }
  const serverKey = removeUndefined(list.map(a => a.toEventTag()))
    .filter(a => a[0] === "server")
    .map(a => a[1])
    .join("\n")

  return useMemo(
    () => ({
      servers: serverKey.split("\n"),
      addServer: async (s: string) => {
        if (!publisher) return

        const u = sanitizeRelayUrl(s)
        if (!u) return
        state?.addToList(EventKind.BlossomServerList, new UnknownTag(["server", u]))
        await state?.saveList(EventKind.BlossomServerList)
      },
      removeServer: async (s: string) => {
        const u = sanitizeRelayUrl(s)
        if (!u) return
        state?.removeFromList(EventKind.BlossomServerList, new UnknownTag(["server", u]))
        await state?.saveList(EventKind.BlossomServerList)
      },
    }),
    [serverKey, publisher, state],
  )
}
