import type { NostrEvent } from "@snort/system"

import modelUrl from "@/assets/nspam-v2.4.bin?url"

import { readScores, writeScores } from "./cache"
import { extractFeatures, type ScorableNote } from "./features"
import { NspamModel } from "./model"

export const NSPAM_VERSION = "v2.4"
/** Calibrated scores above this are treated as reply spam */
export const NSPAM_SPAM_THRESHOLD = 0.5
/** The model is trained on bundles of at most 10 replies per author */
const MAX_BUNDLE = 10

export { extractFeatures, type ScorableNote } from "./features"
export { NspamModel } from "./model"

let modelPromise: Promise<NspamModel> | undefined

export function loadNspamModel() {
  modelPromise ??= fetch(modelUrl)
    .then(r => r.arrayBuffer())
    .then(b => new NspamModel(b))
    .catch(e => {
      modelPromise = undefined
      throw e
    })
  return modelPromise
}

/** Score one bundle of replies from a single author, without touching the cache */
export async function scoreBundle(notes: ReadonlyArray<ScorableNote>) {
  const model = await loadNspamModel()
  return model.score(extractFeatures(notes)).calibrated
}

const memory = new Map<string, number>()

function isReply(ev: NostrEvent) {
  return ev.tags.some(t => t[0] === "e" || t[0] === "E")
}

/**
 * Calibrated spam score per event id. Each reply is classified once: results are kept in
 * memory and in IndexedDB, so repeat renders and later sessions reuse the stored value.
 */
export async function scoreReplies(events: ReadonlyArray<NostrEvent>): Promise<Map<string, number>> {
  const replies = events.filter(isReply)
  const result = new Map<string, number>()
  const missing: NostrEvent[] = []
  for (const ev of replies) {
    const cached = memory.get(ev.id)
    if (cached !== undefined) result.set(ev.id, cached)
    else missing.push(ev)
  }
  if (missing.length === 0) return result

  const stored = await readScores(
    missing.map(e => e.id),
    NSPAM_VERSION,
  )
  const unscored: NostrEvent[] = []
  for (const ev of missing) {
    const score = stored.get(ev.id)
    if (score !== undefined) {
      memory.set(ev.id, score)
      result.set(ev.id, score)
    } else {
      unscored.push(ev)
    }
  }
  if (unscored.length === 0) return result

  const byAuthor = new Map<string, NostrEvent[]>()
  for (const ev of unscored) {
    const list = byAuthor.get(ev.pubkey) ?? []
    list.push(ev)
    byAuthor.set(ev.pubkey, list)
  }

  const model = await loadNspamModel()
  const rows: Array<{ id: string; score: number; model: string; at: number }> = []
  const now = Date.now()
  for (const notes of byAuthor.values()) {
    const bundle = [...notes].sort((a, b) => b.created_at - a.created_at).slice(0, MAX_BUNDLE)
    const score = model.score(extractFeatures(bundle)).calibrated
    for (const ev of notes) {
      memory.set(ev.id, score)
      result.set(ev.id, score)
      rows.push({ id: ev.id, score, model: NSPAM_VERSION, at: now })
    }
  }
  void writeScores(rows)
  return result
}

export function cachedSpamScore(id: string) {
  return memory.get(id)
}

export function isSpamScore(score: number | undefined, threshold = NSPAM_SPAM_THRESHOLD) {
  return score !== undefined && score >= threshold
}
