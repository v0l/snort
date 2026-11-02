export interface ReadMark {
  readUntil: number
  previous: number
  savedAt: number
}

export const SessionGap = 30 * 60

export function advanceMark(mark: ReadMark | undefined, seenAt: number, now: number): ReadMark {
  if (!mark) return { readUntil: seenAt, previous: 0, savedAt: now }
  return { readUntil: Math.max(mark.readUntil, seenAt), previous: mark.previous, savedAt: now }
}

export function startSession(mark: ReadMark | undefined, now: number): ReadMark | undefined {
  if (!mark) return
  if (now - mark.savedAt <= SessionGap) return mark
  return { readUntil: mark.readUntil, previous: mark.readUntil, savedAt: now }
}

export function countSince(times: Array<number>, since: number) {
  return since > 0 ? times.filter(t => t > since).length : 0
}

export function markKey(feed: string, pubkey?: string) {
  return `snort:read:${pubkey?.slice(0, 16) ?? "anon"}:${feed}`
}

export function loadMark(key: string, storage: Storage = window.localStorage): ReadMark | undefined {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as ReadMark) : undefined
  } catch {
    return
  }
}

export function saveMark(key: string, mark: ReadMark, storage: Storage = window.localStorage) {
  try {
    storage.setItem(key, JSON.stringify(mark))
  } catch {
    return
  }
}
