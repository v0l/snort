export interface RailMark {
  label: number
  offset: number
  count: number
}

export function bucketByHour(notes: Array<{ created: number; offset: number }>, now: number): Array<RailMark> {
  const marks = new Map<number, RailMark>()
  for (const n of notes) {
    const h = Math.max(0, Math.floor((now - n.created) / 3600))
    const m = marks.get(h)
    if (m) {
      m.count++
      m.offset = Math.min(m.offset, n.offset)
    } else {
      marks.set(h, { label: h, offset: n.offset, count: 1 })
    }
  }
  return [...marks.values()].sort((a, b) => a.offset - b.offset)
}

export function thinMarks(marks: Array<RailMark>, height: number, minGap = 22) {
  const out: Array<RailMark> = []
  for (const m of marks) {
    const last = out[out.length - 1]
    if (last && m.offset - last.offset < minGap) {
      last.count += m.count
      continue
    }
    out.push({ ...m })
  }
  return out.filter(m => m.offset <= height)
}
