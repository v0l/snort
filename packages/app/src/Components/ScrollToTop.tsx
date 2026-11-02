import { useEffect, useLayoutEffect, useRef } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

const positions = new Map<string, number>()
const RestoreTimeout = 8000

export default function ScrollToTop({ paneOpen }: { paneOpen: boolean }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const paneWasOpen = useRef(paneOpen)

  useEffect(() => {
    window.history.scrollRestoration = "manual"
  }, [])

  useEffect(() => {
    const key = location.key
    const save = () => positions.set(key, window.scrollY)
    window.addEventListener("scroll", save, { passive: true })
    return () => window.removeEventListener("scroll", save)
  }, [location.key])

  useLayoutEffect(() => {
    const keepFeed = paneOpen || paneWasOpen.current
    paneWasOpen.current = paneOpen
    if (keepFeed) return

    if (navigationType !== "POP") {
      window.scrollTo(0, 0)
      return
    }

    const target = positions.get(location.key)
    if (target === undefined) return
    window.scrollTo(0, target)
    if (Math.abs(window.scrollY - target) < 2) return

    const started = Date.now()
    let cancelled = false
    const stop = () => {
      cancelled = true
    }
    window.addEventListener("wheel", stop, { passive: true, once: true })
    window.addEventListener("touchstart", stop, { passive: true, once: true })
    window.addEventListener("keydown", stop, { once: true })
    const ro = new ResizeObserver(() => {
      if (cancelled || Date.now() - started > RestoreTimeout) {
        ro.disconnect()
        return
      }
      window.scrollTo(0, target)
      if (Math.abs(window.scrollY - target) < 2) ro.disconnect()
    })
    ro.observe(document.body)
    return () => {
      ro.disconnect()
      window.removeEventListener("wheel", stop)
      window.removeEventListener("touchstart", stop)
      window.removeEventListener("keydown", stop)
    }
  }, [location.key])

  return null
}
