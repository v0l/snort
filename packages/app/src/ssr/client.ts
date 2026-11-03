import { type CachedMetadata, mapEventToProfile, type RequestBuilder, type TaggedNostrEvent } from "@snort/system"

interface Payload {
  now: number
  origin: string
  queries: Record<string, Array<TaggedNostrEvent>>
  profiles: Record<string, TaggedNostrEvent>
}

let payload: Payload | undefined
let hydrating = false

const realNow = Date.now

export function loadHydration() {
  const el = document.getElementById("ssr-data")
  if (!el?.textContent) return false
  try {
    payload = JSON.parse(el.textContent) as Payload
  } catch {
    return false
  }
  hydrating = !!payload?.queries
  if (hydrating && payload?.now) {
    const pinned = payload.now * 1000
    Date.now = () => pinned
  }
  return hydrating
}

export function finishHydration() {
  hydrating = false
  Date.now = realNow
}

export function isHydrating() {
  return hydrating
}

export function seed(rb: RequestBuilder) {
  const events = hydrating ? payload?.queries?.[rb.id] : undefined
  if (events?.length) rb.withOptions({ extraEvents: events })
}

export function seededProfiles() {
  const out: Array<CachedMetadata> = []
  for (const ev of Object.values(payload?.profiles ?? {})) {
    const profile = mapEventToProfile(ev)
    if (profile) out.push(profile)
  }
  return out
}
