import { afterEach, describe, expect, test } from "bun:test"
import type { SystemInterface, TaggedNostrEvent } from "@snort/system"
import { getHydrationScript, hydrateSnort } from "../src/hydration"

function createEv(
  id: string,
  kind = 1,
  created_at = 100,
  pubkey = "aa",
  tags: string[][] = [],
  relays: string[] = [],
): TaggedNostrEvent {
  return { id, kind, created_at, pubkey, tags, content: "", sig: "", relays }
}

function makeMockSystem(overrides?: Partial<SystemInterface>): SystemInterface {
  return {
    hydrateQuery: () => {},
    getHydrationData: () => ({}),
    ...overrides,
  } as SystemInterface
}

describe("hydrateSnort", () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    // Clean up window mock
    if (originalWindow) {
      globalThis.window = originalWindow
    } else {
      delete (globalThis as any).window
    }
  })

  test("calls system.hydrateQuery for each entry in window.__SNORT_HYDRATION__", () => {
    const hydrated: Array<{ id: string; events: TaggedNostrEvent[] }> = []
    const system = makeMockSystem({
      hydrateQuery: (id: string, events: TaggedNostrEvent[]) => {
        hydrated.push({ id, events })
      },
    })

    const data: Record<string, TaggedNostrEvent[]> = {
      "query-1": [createEv("ev1", 1, 100)],
      "query-2": [createEv("ev2", 0, 200)],
    }

    globalThis.window = { __SNORT_HYDRATION__: data } as any

    hydrateSnort(system)

    expect(hydrated).toHaveLength(2)
    expect(hydrated.find(h => h.id === "query-1")?.events).toHaveLength(1)
    expect(hydrated.find(h => h.id === "query-2")?.events).toHaveLength(1)
  })

  test("deletes window.__SNORT_HYDRATION__ after hydrating", () => {
    const system = makeMockSystem()
    globalThis.window = {
      __SNORT_HYDRATION__: { "q1": [createEv("ev1")] },
    } as any

    hydrateSnort(system)

    expect((globalThis.window as any).__SNORT_HYDRATION__).toBeUndefined()
  })

  test("does nothing when window.__SNORT_HYDRATION__ is undefined", () => {
    let called = false
    const system = makeMockSystem({
      hydrateQuery: () => {
        called = true
      },
    })

    globalThis.window = {} as any
    hydrateSnort(system)

    expect(called).toBe(false)
  })

  test("does nothing when window is undefined (SSR environment)", () => {
    let called = false
    const system = makeMockSystem({
      hydrateQuery: () => {
        called = true
      },
    })

    delete (globalThis as any).window
    hydrateSnort(system)

    expect(called).toBe(false)
  })

  test("does nothing when window.__SNORT_HYDRATION__ is empty object", () => {
    let called = false
    const system = makeMockSystem({
      hydrateQuery: () => {
        called = true
      },
    })

    globalThis.window = { __SNORT_HYDRATION__: {} } as any
    hydrateSnort(system)

    expect(called).toBe(false)
  })

  test("hydrates events with correct structure after JSON round-trip", () => {
    const hydrated: Array<{ id: string; events: TaggedNostrEvent[] }> = []
    const system = makeMockSystem({
      hydrateQuery: (id: string, events: TaggedNostrEvent[]) => {
        hydrated.push({ id, events })
      },
    })

    const originalData: Record<string, TaggedNostrEvent[]> = {
      "feed": [createEv("note1", 1, 1000, "author1", [], ["wss://relay.test"])],
    }

    // Simulate serialization/deserialization through <script> tag
    const jsonStr = JSON.stringify(originalData)
    const deserialized = JSON.parse(jsonStr)

    globalThis.window = { __SNORT_HYDRATION__: deserialized } as any

    hydrateSnort(system)

    expect(hydrated).toHaveLength(1)
    expect(hydrated[0].id).toBe("feed")
    expect(hydrated[0].events[0].id).toBe("note1")
    expect(hydrated[0].events[0].kind).toBe(1)
    expect(hydrated[0].events[0].relays).toEqual(["wss://relay.test"])
  })
})

describe("getHydrationScript", () => {
  test("returns empty string when no hydration data", () => {
    const system = makeMockSystem({
      getHydrationData: () => ({}),
    })
    expect(getHydrationScript(system)).toBe("")
  })

  test("returns script tag with hydration data", () => {
    const data: Record<string, TaggedNostrEvent[]> = {
      "query-1": [createEv("ev1", 1, 100)],
    }
    const system = makeMockSystem({
      getHydrationData: () => data,
    })

    const script = getHydrationScript(system)

    expect(script).toMatch(/^<script>window\.__SNORT_HYDRATION__ = /)
    expect(script).toMatch(/<\/script>$/)

    // Extract and verify the JSON
    const jsonMatch = script.match(/window\.__SNORT_HYDRATION__ = (.+)<\/script>/)
    expect(jsonMatch).not.toBeNull()
    const parsed = JSON.parse(jsonMatch![1])
    expect(parsed["query-1"]).toHaveLength(1)
    expect(parsed["query-1"][0].id).toBe("ev1")
  })

  test("returns valid JSON for multiple queries", () => {
    const data: Record<string, TaggedNostrEvent[]> = {
      feed: [createEv("n1", 1, 100), createEv("n2", 1, 200)],
      profiles: [createEv("p1", 0, 50, "user1")],
    }
    const system = makeMockSystem({
      getHydrationData: () => data,
    })

    const script = getHydrationScript(system)
    const jsonMatch = script.match(/window\.__SNORT_HYDRATION__ = (.+)<\/script>/)
    const parsed = JSON.parse(jsonMatch![1])

    expect(Object.keys(parsed)).toHaveLength(2)
    expect(parsed["feed"]).toHaveLength(2)
    expect(parsed["profiles"]).toHaveLength(1)
  })

  test("script content with </script> in data will prematurely close the tag (known limitation)", () => {
    // Event content containing </script> is a known XSS vector for inline script tags.
    // JSON.stringify does NOT escape </script> sequences, so this will break the tag.
    // A production implementation should sanitize (e.g., replace </script with <\/script).
    const data: Record<string, TaggedNostrEvent[]> = {
      test: [createEv("ev1", 1, 100, "pk", [["content", "text with </script> in it"]])],
    }
    const system = makeMockSystem({
      getHydrationData: () => data,
    })

    const script = getHydrationScript(system)

    // Verify the script starts correctly
    expect(script).toMatch(/^<script>window\.__SNORT_HYDRATION__ = /)

    // The </script> in the event content will prematurely close the tag
    // This is a known limitation of the current implementation
    const firstClose = script.indexOf("</script>")
    const lastClose = script.lastIndexOf("</script>")
    expect(firstClose).toBeLessThan(lastClose) // premature close detected
  })
})

describe("SSR Hydration — React wiring integration", () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    if (originalWindow) {
      globalThis.window = originalWindow
    } else {
      delete (globalThis as any).window
    }
  })

  test("full cycle: getHydrationScript → parse → hydrateSnort", () => {
    const events = [createEv("ev1", 1, 100), createEv("ev2", 1, 200)]

    // --- Server side ---
    const serverSystem = makeMockSystem({
      getHydrationData: () => ({
        "my-query": events,
      }),
    })

    const script = getHydrationScript(serverSystem)

    // Simulate browser parsing the <script> tag
    const jsonMatch = script.match(/window\.__SNORT_HYDRATION__ = (.+)<\/script>/)
    expect(jsonMatch).not.toBeNull()
    const hydrationData = JSON.parse(jsonMatch![1])

    // --- Client side ---
    const hydrated: Array<{ id: string; events: TaggedNostrEvent[] }> = []
    const clientSystem = makeMockSystem({
      hydrateQuery: (id: string, events: TaggedNostrEvent[]) => {
        hydrated.push({ id, events })
      },
    })

    globalThis.window = { __SNORT_HYDRATION__: hydrationData } as any
    hydrateSnort(clientSystem)

    // Verify data arrived intact
    expect(hydrated).toHaveLength(1)
    expect(hydrated[0].id).toBe("my-query")
    expect(hydrated[0].events).toHaveLength(2)
    expect(hydrated[0].events[0].id).toBe("ev1")
    expect(hydrated[0].events[1].id).toBe("ev2")

    // Verify cleanup
    expect((globalThis.window as any).__SNORT_HYDRATION__).toBeUndefined()
  })
})
