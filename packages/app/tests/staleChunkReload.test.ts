import { describe, expect, test } from "bun:test"

import { reloadOnStaleChunk } from "../src/Utils/staleChunkReload"

function memoryStorage() {
  const data: Record<string, string> = {}
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v
    },
  } as Storage
}

function fakeWindow() {
  const target = new EventTarget() as EventTarget & { reloads: number; location: { reload: () => void } }
  target.reloads = 0
  target.location = { reload: () => target.reloads++ }
  return target
}

function preloadError() {
  return new Event("vite:preloadError", { cancelable: true })
}

describe("reloadOnStaleChunk", () => {
  test("reloads once and swallows the error", () => {
    const win = fakeWindow()
    reloadOnStaleChunk(win as unknown as Window, memoryStorage())
    const ev = preloadError()
    win.dispatchEvent(ev)
    expect(win.reloads).toBe(1)
    expect(ev.defaultPrevented).toBe(true)
  })

  test("lets a second failure through instead of looping", () => {
    const win = fakeWindow()
    const storage = memoryStorage()
    reloadOnStaleChunk(win as unknown as Window, storage)
    win.dispatchEvent(preloadError())
    const again = preloadError()
    win.dispatchEvent(again)
    expect(win.reloads).toBe(1)
    expect(again.defaultPrevented).toBe(false)
  })
})
