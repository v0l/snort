import useHistoryState from "@/Hooks/useHistoryState"

export interface WindowChunk {
  since: number
  until: number
}

export default function useTimelineChunks(opt: { window?: number; firstChunkSize?: number; now: number }) {
  const windowSize = opt.window ?? 60 * 60 * 2
  const [windows, setWindows] = useHistoryState(1, "timelineWindows")

  let offset = opt.now
  const chunks: Array<WindowChunk> = []
  for (let x = 0; x < windows; x++) {
    // offset from now going backwards in time
    const size = x === 0 && opt.firstChunkSize ? opt.firstChunkSize : windowSize
    chunks.push({
      since: offset - size,
      until: offset,
    })
    // NIP-01 filters are inclusive on both since and until — step past the
    // boundary so adjacent chunks don't both fetch (and render) an event
    // created exactly at the boundary timestamp.
    offset -= size + 1
  }

  return {
    now: opt.now,
    chunks,
    showMore: () => {
      setWindows(windows + 1)
    },
    loadUntil: (t: number) => {
      let need = windows
      let edge = chunks[chunks.length - 1]?.since ?? opt.now
      while (edge > t && need < 48) {
        edge -= windowSize + 1
        need++
      }
      if (need > windows) setWindows(need)
    },
  }
}
