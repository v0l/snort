import { unixNow } from "@snort/shared"
import { useEffect, useMemo, useState } from "react"

import useLogin from "@/Hooks/useLogin"
import { advanceMark, loadMark, markKey, type ReadMark, saveMark, startSession } from "@/Utils/readMark"

const FeedSelector = "[data-feed-column]"
const NoteSelector = "[data-created]"

function scan(root: Element) {
  let seen = 0
  let newest = 0
  for (const el of root.querySelectorAll<HTMLElement>(NoteSelector)) {
    if (el.closest("[data-pane-scroller]")) continue
    const created = Number(el.dataset.created)
    newest = Math.max(newest, created)
    const r = el.getBoundingClientRect()
    if (r.bottom > 0 && r.top < window.innerHeight * 0.6) {
      seen = Math.max(seen, created)
    }
  }
  return { seen, newest }
}

export function useLastRead(feed: string) {
  const pubkey = useLogin(s => s.publicKey)
  const key = markKey(feed, pubkey)
  const [mark] = useState<ReadMark | undefined>(() => {
    const m = startSession(loadMark(key), unixNow())
    if (m) saveMark(key, m)
    return m
  })

  useEffect(() => {
    let current = mark
    let pending = 0
    const tick = () => {
      pending = 0
      const root = document.querySelector(FeedSelector)
      if (!root) return
      const { seen, newest } = scan(root)
      if (seen === 0 || (current && seen <= current.readUntil)) return
      current = advanceMark(current, seen, unixNow(), newest)
      saveMark(key, current)
    }
    const onScroll = () => {
      if (!pending) pending = window.setTimeout(tick, 400)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    const first = window.setTimeout(tick, 1500)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(pending)
      window.clearTimeout(first)
    }
  }, [key])

  return useMemo(() => ({ leftOffAt: mark?.previous ?? 0 }), [mark])
}

export function scrollToLeftOff() {
  const divider = document.querySelector<HTMLElement>("[data-left-off]")
  if (!divider) return false
  const top = divider.getBoundingClientRect().top + window.scrollY - 64
  window.scrollTo({ top, behavior: "smooth" })
  return true
}
