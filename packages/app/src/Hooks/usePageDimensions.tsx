import { useEffect, useState } from "react"

export default function usePageDimensions() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const root = document.querySelector<HTMLDivElement>("#root")
    if (!root) return
    setDimensions({ width: root.clientWidth, height: root.clientHeight })
    if (!("ResizeObserver" in window)) return
    const observer = new ResizeObserver(entries => {
      if (entries[0].target === root) {
        const { width, height } = entries[0].contentRect
        setDimensions({ width, height })
      }
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  return dimensions
}
