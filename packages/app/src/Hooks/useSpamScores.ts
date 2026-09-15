import type { NostrEvent } from "@snort/system"
import { useEffect, useMemo, useRef, useState } from "react"

import usePreferences from "@/Hooks/usePreferences"
import { NSPAM_SPAM_THRESHOLD, scoreReplies } from "@/Utils/nspam"

/**
 * Classify replies with nspam. Each event is scored once and the result is cached in
 * memory and IndexedDB, so re-renders and later visits reuse the stored classification.
 */
export function useSpamScores(events: ReadonlyArray<NostrEvent>) {
  const filterSpamReplies = usePreferences(s => s.filterSpamReplies)
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const latest = useRef(events)
  latest.current = events

  const ids = useMemo(() => events.map(e => e.id).join(","), [events])

  useEffect(() => {
    if (!filterSpamReplies || latest.current.length === 0) return
    let cancelled = false
    scoreReplies(latest.current)
      .then(r => {
        if (!cancelled) setScores(r)
      })
      .catch(e => console.warn("nspam scoring failed", e))
    return () => {
      cancelled = true
    }
  }, [ids, filterSpamReplies])

  return scores
}

/** Ids of events classified as reply spam */
export function useSpamIds(events: ReadonlyArray<NostrEvent>, threshold = NSPAM_SPAM_THRESHOLD) {
  const scores = useSpamScores(events)
  return useMemo(() => {
    const out = new Set<string>()
    for (const [id, score] of scores) {
      if (score >= threshold) out.add(id)
    }
    return out
  }, [scores, threshold])
}
