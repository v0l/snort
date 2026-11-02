import { useEffect, useState } from "react"

import { countSince } from "@/Utils/readMark"

export function useNewNoteCount(since: number) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (since === 0) return
    const root = document.querySelector("[data-feed-column]")
    if (!root) return
    const update = () => {
      const times = [...root.querySelectorAll<HTMLElement>("[data-created]")]
        .filter(el => !el.closest("[data-pane-scroller]"))
        .map(el => Number(el.dataset.created))
      setCount(countSince([...new Set(times)], since))
    }
    update()
    const mo = new MutationObserver(update)
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [since])
  return count
}
