const ReloadKey = "stale-chunk-reload"
const ReloadWindowMs = 10_000

export function reloadOnStaleChunk(target: Window = window, storage: Storage = window.sessionStorage) {
  target.addEventListener("vite:preloadError", event => {
    const last = Number(storage.getItem(ReloadKey) ?? 0)
    if (Date.now() - last < ReloadWindowMs) return
    storage.setItem(ReloadKey, String(Date.now()))
    event.preventDefault()
    target.location.reload()
  })
}
