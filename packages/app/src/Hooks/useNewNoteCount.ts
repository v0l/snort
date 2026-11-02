import { useEffect, useState } from "react"

import { countSince, leftOffTarget } from "@/Utils/readMark"

export function useLeftOff(since: number) {
  const [state, setState] = useState<{ count: number; before?: string }>({ count: 0 })
  useEffect(() => {
    if (since === 0) return
    const root = document.querySelector("[data-feed-column]")
    if (!root) return
    const update = () => {
      const notes = [...root.querySelectorAll<HTMLElement>("[data-created][data-id]")]
        .filter(el => !el.closest("[data-pane-scroller]"))
        .map(el => ({ id: el.dataset.id ?? "", created: Number(el.dataset.created) }))
      const unique = [...new Map(notes.map(n => [n.id, n])).values()]
      const before = leftOffTarget(unique, since)
      const count = countSince(
        unique.map(n => n.created),
        since,
      )
      setState(s => (s.count === count && s.before === before ? s : { count, before }))
    }
    update()
    const mo = new MutationObserver(update)
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [since])
  return state
}
