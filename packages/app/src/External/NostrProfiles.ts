import { throwIfOffline, unwrap } from "@snort/shared"

/** A single classified profile from the nostr-profiles API. */
export interface NostrProfileResult {
  pubkey: string
  name?: string | null
  display_name?: string | null
  about?: string | null
  picture?: string | null
  nip05?: string | null
  event_count: number
  classification_status: "none" | "current" | { stale: { epoch: number } }
  classification?: ClassificationInfo | null
  metadata_json?: string | null
}

export interface ClassificationInfo {
  scores: Record<string, number>
  bio: string
  confidence: number
  analyzed_at?: string | null
  analyzed_event_count: number
  kind_breakdown: Array<{
    kind: number
    name: string
    count: number
  }>
}

/** Shorter recent-classification result (used by /api/recent and /api/search). */
export interface RecentClassification {
  pubkey: string
  name?: string | null
  display_name?: string | null
  picture?: string | null
  scores: Record<string, number>
  bio: string
  confidence: number
  analyzed_at?: string | null
  metadata_json?: string | null
}

export interface LabelCount {
  label: string
  count: number
}

export interface ApiStats {
  total_profiles: number
  classified_profiles: number
  total_events: number
  images_classified: number
  queue_size: number
  labels: {
    total_unique_labels: number
    label_counts: Array<LabelCount>
  }
}

/**
 * Client for the nostr-profiles API (https://github.com/v0l/nostr-profiles).
 *
 * Provides profile classification data + search. The same server also acts as a
 * NIP-50 search relay at `wss://profiles.v0l.io` for kind 0 metadata queries.
 */
export class NostrProfilesApi {
  #url: string

  constructor(url: string) {
    this.#url = url
  }

  /** Get full profile details + classification. */
  async getProfile(pubkey: string): Promise<NostrProfileResult> {
    return this.#getJson(`/api/profile/${encodeURIComponent(pubkey)}`)
  }

  /** Recently classified profiles. */
  async getRecent(limit = 20): Promise<Array<RecentClassification>> {
    return this.#getJson(`/api/recent?limit=${limit}`)
  }

  /** FTS5 search across labels, bios, names, NIP-05. */
  async search(q: string, limit = 20): Promise<Array<RecentClassification>> {
    return this.#getJson(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`)
  }

  /** Exact label match search. */
  async searchByLabel(label: string, limit = 20): Promise<Array<RecentClassification>> {
    return this.#getJson(`/api/search/label?label=${encodeURIComponent(label)}&limit=${limit}`)
  }

  /** System stats including label distribution. */
  async getStats(): Promise<ApiStats> {
    return this.#getJson("/api/stats")
  }

  async #getJson<T>(path: string): Promise<T> {
    throwIfOffline()
    const rsp = await fetch(`${this.#url}${path}`, {
      headers: { accept: "application/json" },
    })
    if (rsp.ok) {
      const text = (await rsp.text()) as string | null
      if ((text?.length ?? 0) > 0) {
        const obj = JSON.parse(unwrap(text))
        return obj as T
      }
      return {} as T
    }
    throw new Error(`nostr-profiles API error: ${rsp.status}`)
  }
}

/** Singleton for convenience (initialized lazily with CONFIG.profilesUrl). */
let _instance: NostrProfilesApi | null = null

export function getNostrProfilesApi(): NostrProfilesApi {
  if (!_instance) {
    _instance = new NostrProfilesApi(CONFIG.profilesUrl)
  }
  return _instance
}
