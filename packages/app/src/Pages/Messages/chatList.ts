export interface ListedChat {
  id: string
  lastMessage: number
  participants: Array<{ id: string }>
}

export interface TimedMessage {
  id: string
  created_at: number
}

export function isSelfChat(chat: ListedChat, myPubkey?: string) {
  return chat.participants.length === 1 && chat.participants[0].id === myPubkey
}

export function sortChats<T extends ListedChat>(chats: Array<T>, myPubkey?: string): Array<T> {
  return [...chats].sort((a, b) => {
    const aSelf = isSelfChat(a, myPubkey)
    const bSelf = isSelfChat(b, myPubkey)
    if (aSelf !== bSelf) return aSelf ? -1 : 1
    return b.lastMessage - a.lastMessage
  })
}

export function splitChats<T extends ListedChat>(
  chats: Array<T>,
  myPubkey: string | undefined,
  followDistance: (pk: string) => number,
  maxTrustedDistance = 2,
) {
  const trusted: Array<T> = []
  const other: Array<T> = []
  for (const c of chats) {
    if (c.participants.length === 0) continue
    if (isSelfChat(c, myPubkey) || c.participants.some(p => p.id === myPubkey)) {
      trusted.push(c)
    } else if (c.participants.some(p => followDistance(p.id) <= maxTrustedDistance)) {
      trusted.push(c)
    } else {
      other.push(c)
    }
  }
  return { trusted: sortChats(trusted, myPubkey), other: sortChats(other, myPubkey) }
}

export function countUnread(messages: Array<{ from: string; created_at: number }>, lastRead: number, myPubkey?: string) {
  return messages.filter(m => m.created_at > lastRead && m.from !== myPubkey).length
}

export function matchesQuery(haystacks: Array<string | undefined>, query: string) {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return true
  return haystacks.some(h => h?.toLowerCase().includes(q))
}

export function sortMessages<T extends TimedMessage>(messages: Array<T>): Array<T> {
  return [...messages].sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id))
}

export function dayKey(createdAt: number) {
  const d = new Date(createdAt * 1000)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function startsNewDay(messages: Array<TimedMessage>, index: number) {
  if (index === 0) return true
  return dayKey(messages[index - 1].created_at) !== dayKey(messages[index].created_at)
}

export function continuesRun(messages: Array<TimedMessage & { from: string }>, index: number, gapSeconds = 300) {
  if (index === 0 || startsNewDay(messages, index)) return false
  const prev = messages[index - 1]
  const cur = messages[index]
  return prev.from === cur.from && cur.created_at - prev.created_at <= gapSeconds
}

export function previewText(content: string | undefined, max = 80) {
  const flat = (content ?? "").replace(/\s+/g, " ").trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}
