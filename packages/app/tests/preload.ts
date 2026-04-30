/**
 * Preload for bun:test — provides globals that Vite normally injects via `define`,
 * plus browser API stubs needed by app modules evaluated at import time.
 */
import config from "../config/default.json"

//@ts-expect-error Vite define
globalThis.CONFIG = config
//@ts-expect-error Vite define
globalThis.global = globalThis

if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {}
  //@ts-expect-error browser stub
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

if (typeof globalThis.window === "undefined") {
  //@ts-expect-error browser stub
  globalThis.window = globalThis
}
