import { EventKind, type NostrEvent, NostrLink, parseZap } from "@snort/system"

export const HighlightKind = 9802 as EventKind

export type DiscoveryReason = "thread" | "zapped" | "reposted" | "highlighted"

export interface DiscoveryItem {
  link: NostrLink
  author?: string
  reason: DiscoveryReason
  by: Array<string>
  score: number
}

export interface PersonSuggestion {
  pubkey: string
  by: Array<string>
}

const ReasonWeight: Record<DiscoveryReason, number> = {
  thread: 3,
  zapped: 2,
  highlighted: 2,
  reposted: 1,
}

function tag(ev: NostrEvent, key: string) {
  return ev.tags.find(t => t[0] === key)
}

function targetOf(ev: NostrEvent): { link: NostrLink; author?: string } | undefined {
  const p = tag(ev, "p")?.[1]
  switch (ev.kind) {
    case EventKind.ZapReceipt: {
      const zap = parseZap(ev)
      return zap.event ? { link: zap.event, author: zap.receiver } : undefined
    }
    case HighlightKind: {
      const a = tag(ev, "a")
      if (a) {
        const link = NostrLink.fromTag(a)
        return { link, author: link.author }
      }
      const e = tag(ev, "e")
      return e ? { link: NostrLink.fromTag(e), author: p } : undefined
    }
    case EventKind.TextNote: {
      const root = ev.tags.find(t => t[0] === "e" && t[3] === "root")
      return root ? { link: NostrLink.fromTag(["e", root[1]]), author: p } : undefined
    }
    case EventKind.Comment: {
      const root = tag(ev, "E")
      return root ? { link: NostrLink.fromTag(["e", root[1]]), author: tag(ev, "P")?.[1] } : undefined
    }
    case EventKind.Repost: {
      const e = tag(ev, "e")
      return e ? { link: NostrLink.fromTag(["e", e[1]]), author: p } : undefined
    }
  }
}

function reasonOf(kind: number): DiscoveryReason | undefined {
  switch (kind) {
    case EventKind.TextNote:
    case EventKind.Comment:
      return "thread"
    case EventKind.ZapReceipt:
      return "zapped"
    case EventKind.Repost:
      return "reposted"
    case HighlightKind:
      return "highlighted"
  }
}

function actorOf(ev: NostrEvent) {
  return ev.kind === EventKind.ZapReceipt ? parseZap(ev).sender : ev.pubkey
}

export function rankDiscovery(
  events: Array<NostrEvent>,
  follows: Array<string>,
  me: string | undefined,
): Array<DiscoveryItem> {
  const followSet = new Set(follows)
  const groups = new Map<string, { link: NostrLink; author?: string; reasons: Map<DiscoveryReason, Set<string>> }>()

  for (const ev of events) {
    const reason = reasonOf(ev.kind)
    const actor = actorOf(ev)
    const target = targetOf(ev)
    if (!reason || !actor || !target || !followSet.has(actor)) continue
    if (target.author && (followSet.has(target.author) || target.author === me)) continue
    const key = target.link.tagKey
    const g = groups.get(key) ?? { link: target.link, author: target.author, reasons: new Map() }
    g.author ??= target.author
    const set = g.reasons.get(reason) ?? new Set()
    set.add(actor)
    g.reasons.set(reason, set)
    groups.set(key, g)
  }

  const items: Array<DiscoveryItem> = []
  for (const { link, author, reasons } of groups.values()) {
    let best: DiscoveryReason | undefined
    let bestScore = -1
    let score = 0
    for (const [reason, actors] of reasons) {
      const s = actors.size * ReasonWeight[reason]
      score += s
      if (s > bestScore || (s === bestScore && best && ReasonWeight[reason] > ReasonWeight[best])) {
        best = reason
        bestScore = s
      }
    }
    if (!best) continue
    const by = [...(reasons.get(best) ?? [])]
    if (best === "thread" && by.length < 2) continue
    items.push({ link, author, reason: best, by, score })
  }
  return items.sort((a, b) => b.score - a.score)
}

export function suggestPeople(
  replies: Array<NostrEvent>,
  follows: Array<string>,
  me: string | undefined,
  min = 2,
): Array<PersonSuggestion> {
  const followSet = new Set(follows)
  const counts = new Map<string, Set<string>>()
  for (const ev of replies) {
    if (!followSet.has(ev.pubkey)) continue
    for (const t of ev.tags) {
      if (t[0] !== "p" || !t[1] || followSet.has(t[1]) || t[1] === me) continue
      const set = counts.get(t[1]) ?? new Set()
      set.add(ev.pubkey)
      counts.set(t[1], set)
    }
  }
  return [...counts.entries()]
    .filter(([, by]) => by.size >= min)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([pubkey, by]) => ({ pubkey, by: [...by] }))
}
