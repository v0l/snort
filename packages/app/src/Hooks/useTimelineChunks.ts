import { useState } from "react"

export interface WindowChunk {
  since: number
  until: number
}

export default function useTimelineChunks(opt: { window?: number; firstChunkSize?: number; now: number }) {
  const windowSize = opt.window ?? 60 * 60 * 2
  const [windows, setWindows] = useState(1)

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
      setWindows(s => s + 1)
    },
  }
}
