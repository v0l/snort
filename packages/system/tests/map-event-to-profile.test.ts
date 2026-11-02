import { describe, expect, test } from "bun:test"
import { mapEventToProfile } from "../src/cache"

const ev = { id: "i", pubkey: "pk", created_at: 100, kind: 0, tags: [], content: '{"name":"a"}', sig: "" }

describe("mapEventToProfile", () => {
  test("keeps the given loaded time instead of stamping now", () => {
    expect(mapEventToProfile(ev, 0)?.loaded).toBe(0)
  })

  test("stamps now when no loaded time is given", () => {
    const before = Date.now()
    expect(mapEventToProfile(ev)?.loaded).toBeGreaterThanOrEqual(before)
  })
})
