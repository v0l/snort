import { unixNow } from "@snort/shared"
import { useEffect, useRef, useState } from "react"
import { FormattedMessage } from "react-intl"

import { bucketByHour, type RailMark, thinMarks } from "./timeRailMarks"

const Inset = 64

function collect(root: Element) {
  const docH = document.documentElement.scrollHeight
  const notes: Array<{ created: number; offset: number }> = []
  for (const el of root.querySelectorAll<HTMLElement>("[data-created]")) {
    if (el.closest("[data-pane-scroller]")) continue
    const top = el.getBoundingClientRect().top + window.scrollY
    notes.push({ created: Number(el.dataset.created), offset: top / docH })
  }
  const leftOff = root.querySelector<HTMLElement>("[data-left-off]")
  const leftOffAt = leftOff ? (leftOff.getBoundingClientRect().top + window.scrollY) / docH : undefined
  return { notes, leftOffAt, docH }
}

export function TimeRail() {
  const track = useRef<HTMLDivElement>(null)
  const [marks, setMarks] = useState<Array<RailMark>>([])
  const [leftOff, setLeftOff] = useState<number>()
  const [thumb, setThumb] = useState({ top: 0, height: 0 })

  useEffect(() => {
    const root = document.querySelector("[data-feed-column]")
    if (!root || !track.current) return
    let raf = 0
    const draw = () => {
      raf = 0
      const h = track.current?.clientHeight ?? 0
      const { notes, leftOffAt, docH } = collect(root)
      const scaled = notes.map(n => ({ created: n.created, offset: n.offset * h }))
      setMarks(thinMarks(bucketByHour(scaled, unixNow()), h))
      setLeftOff(leftOffAt !== undefined ? leftOffAt * h : undefined)
      setThumb({ top: (window.scrollY / docH) * h, height: Math.max(20, (window.innerHeight / docH) * h) })
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const mo = new MutationObserver(schedule)
    mo.observe(root, { childList: true, subtree: true })
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    schedule()
    return () => {
      mo.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [])

  const jumpTo = (fraction: number) => {
    window.scrollTo({ top: fraction * document.documentElement.scrollHeight - Inset, behavior: "smooth" })
  }

  return (
    <nav className="hidden md:block sticky top-0 h-screen w-8 flex-none border-r select-none" aria-label="Jump to time">
      <div ref={track} className="absolute inset-x-0 top-16 bottom-5">
        <div
          className="absolute left-1 right-1 rounded-md bg-layer-2 border"
          style={{ top: thumb.top, height: thumb.height }}
        />
        {marks.map(m => (
          <button
            key={`${m.label}:${m.offset}`}
            type="button"
            className="plain absolute inset-x-0 flex flex-col items-center gap-0.5 text-[11px] font-semibold text-neutral-500 hover:text-white light:hover:text-black"
            style={{ top: m.offset - 2 }}
            onClick={() => jumpTo(m.offset / (track.current?.clientHeight || 1))}
            title={m.label === 0 ? "Jump to the last hour" : `Jump to ${m.label} hours ago`}
          >
            <span>{m.label === 0 ? <FormattedMessage defaultMessage="now" /> : `${m.label}h`}</span>
            <i
              className="block h-[3px] rounded bg-neutral-500 opacity-50"
              style={{ width: Math.min(22, 6 + m.count * 2) }}
            />
          </button>
        ))}
        {leftOff !== undefined && (
          <div className="absolute inset-x-0 h-0.5 bg-primary" style={{ top: leftOff }} title="Where you left off" />
        )}
      </div>
    </nav>
  )
}
