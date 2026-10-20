import { describe, expect, test } from "bun:test"
import { TranslationCache } from "../src/Components/Event/Note/translationCache"

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v
    },
  }
}

describe("TranslationCache", () => {
  test("keys are scoped by language, case-insensitive", () => {
    const cache = new TranslationCache(undefined)
    cache.set("a", "en", { text: "hi", source: "ES" })
    expect(cache.get("a", "EN")).toEqual({ text: "hi", source: "ES" })
    expect(cache.get("a", "DE")).toBeUndefined()
    expect(cache.get("b", "EN")).toBeUndefined()
  })

  test("resolve loads once and caches skipped results", async () => {
    const cache = new TranslationCache(undefined)
    let calls = 0
    const load = async () => {
      calls++
      return { skipped: true } as const
    }
    expect(await cache.resolve("a", "EN", load)).toEqual({ skipped: true })
    expect(await cache.resolve("a", "EN", load)).toEqual({ skipped: true })
    expect(calls).toBe(1)
  })

  test("concurrent resolves share one request", async () => {
    const cache = new TranslationCache(undefined)
    let calls = 0
    const load = async () => {
      calls++
      await new Promise(r => setTimeout(r, 10))
      return { text: "x", source: "FR" }
    }
    const results = await Promise.all([cache.resolve("a", "EN", load), cache.resolve("a", "EN", load)])
    expect(calls).toBe(1)
    expect(results[0]).toBe(results[1])
  })

  test("failures are not cached and can be retried", async () => {
    const cache = new TranslationCache(undefined)
    let calls = 0
    const load = async () => {
      calls++
      if (calls === 1) throw new Error("503")
      return { text: "ok", source: "FR" }
    }
    await expect(cache.resolve("a", "EN", load)).rejects.toThrow("503")
    expect(await cache.resolve("a", "EN", load)).toEqual({ text: "ok", source: "FR" })
    expect(calls).toBe(2)
  })

  test("evicts least recently used beyond the limit", () => {
    const cache = new TranslationCache(undefined, 2)
    cache.set("a", "EN", { skipped: true })
    cache.set("b", "EN", { skipped: true })
    cache.get("a", "EN")
    cache.set("c", "EN", { skipped: true })
    expect(cache.get("a", "EN")).toBeDefined()
    expect(cache.get("b", "EN")).toBeUndefined()
    expect(cache.get("c", "EN")).toBeDefined()
  })

  test("persists on flush and restores in a new instance", () => {
    const storage = memoryStorage()
    const first = new TranslationCache(storage)
    first.set("a", "EN", { text: "hi", source: "ES" })
    first.set("b", "EN", { skipped: true })
    first.flush()
    const second = new TranslationCache(storage)
    expect(second.get("a", "EN")).toEqual({ text: "hi", source: "ES" })
    expect(second.get("b", "EN")).toEqual({ skipped: true })
  })

  test("ignores corrupt storage and survives write failures", () => {
    const corrupt = memoryStorage({ "translations:v1": "{not json" })
    const cache = new TranslationCache(corrupt)
    expect(cache.get("a", "EN")).toBeUndefined()
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota")
      },
    }
    const noisy = new TranslationCache(full)
    noisy.set("a", "EN", { skipped: true })
    expect(() => noisy.flush()).not.toThrow()
    expect(noisy.get("a", "EN")).toEqual({ skipped: true })
  })

  test("drops malformed entries when restoring", () => {
    const storage = memoryStorage({
      "translations:v1": JSON.stringify([
        ["a:EN", { skipped: true }],
        [1, {}],
        ["b:EN", null],
      ]),
    })
    const cache = new TranslationCache(storage)
    expect(cache.get("a", "EN")).toEqual({ skipped: true })
    expect(cache.get("b", "EN")).toBeUndefined()
  })
})
