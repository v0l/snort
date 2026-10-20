export type TranslationEntry = { skipped: true } | { skipped?: false; text: string; source: string }

interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const StorageKey = "translations:v1"
const PersistDelayMs = 1_000

export class TranslationCache {
  #entries: Map<string, TranslationEntry> | undefined
  #inflight = new Map<string, Promise<TranslationEntry>>()
  #timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly storage: Storage | undefined,
    private readonly maxEntries = 300,
  ) {}

  static key(id: string, lang: string) {
    return `${id}:${lang.toUpperCase()}`
  }

  get(id: string, lang: string): TranslationEntry | undefined {
    const key = TranslationCache.key(id, lang)
    const entries = this.#load()
    const hit = entries.get(key)
    if (hit) {
      entries.delete(key)
      entries.set(key, hit)
    }
    return hit
  }

  set(id: string, lang: string, entry: TranslationEntry) {
    const entries = this.#load()
    const key = TranslationCache.key(id, lang)
    entries.delete(key)
    entries.set(key, entry)
    while (entries.size > this.maxEntries) {
      entries.delete(entries.keys().next().value as string)
    }
    this.#schedulePersist()
  }

  async resolve(id: string, lang: string, load: () => Promise<TranslationEntry>): Promise<TranslationEntry> {
    const hit = this.get(id, lang)
    if (hit) return hit

    const key = TranslationCache.key(id, lang)
    const pending = this.#inflight.get(key)
    if (pending) return pending

    const request = load()
      .then(entry => {
        this.set(id, lang, entry)
        return entry
      })
      .finally(() => this.#inflight.delete(key))
    this.#inflight.set(key, request)
    return request
  }

  flush() {
    if (this.#timer) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }
    if (!this.storage || !this.#entries) return
    try {
      this.storage.setItem(StorageKey, JSON.stringify([...this.#entries]))
    } catch {
      return
    }
  }

  #load() {
    if (this.#entries) return this.#entries
    this.#entries = new Map()
    try {
      const raw = this.storage?.getItem(StorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (const [key, entry] of parsed.slice(-this.maxEntries)) {
            if (typeof key === "string" && entry && typeof entry === "object") {
              this.#entries.set(key, entry)
            }
          }
        }
      }
    } catch {
      this.#entries.clear()
    }
    return this.#entries
  }

  #schedulePersist() {
    if (!this.storage || this.#timer) return
    this.#timer = setTimeout(() => this.flush(), PersistDelayMs)
  }
}

export const translationCache = new TranslationCache(typeof localStorage !== "undefined" ? localStorage : undefined)

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => translationCache.flush())
}
