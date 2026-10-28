import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { createElement } from "react"
import type { SystemInterface } from "@snort/system"
import { SnortContext } from "../src/context"
import { useUserProfile } from "../src/useUserProfile"

function Name({ pubkey }: { pubkey: string }) {
  const p = useUserProfile(pubkey)
  return createElement("span", null, p?.name ?? "unknown")
}

function systemWith(profiles: Record<string, { name: string }>) {
  return {
    profileLoader: {
      cache: {
        getFromCache: (k: string) => profiles[k],
        subscribe: () => () => {},
      },
      TrackKeys: () => {},
      UntrackKeys: () => {},
    },
  } as unknown as SystemInterface
}

describe("useUserProfile on the server", () => {
  test("renders a cached profile instead of an empty one", () => {
    const html = renderToString(
      createElement(SnortContext.Provider, { value: systemWith({ aa: { name: "alice" } }) }, createElement(Name, { pubkey: "aa" })),
    )
    expect(html).toContain("alice")
  })

  test("renders the fallback when the profile is not cached", () => {
    const html = renderToString(
      createElement(SnortContext.Provider, { value: systemWith({}) }, createElement(Name, { pubkey: "bb" })),
    )
    expect(html).toContain("unknown")
  })
})
