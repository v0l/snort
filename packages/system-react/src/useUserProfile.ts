import type { CachedMetadata, ProfilePriority } from "@snort/system"
import type { RefObject } from "react"
import { use, useEffect, useRef, useSyncExternalStore } from "react"
import { SnortContext } from "./context"

/**
 * Gets a profile from cache or requests it from the relays.
 *
 * @param pubKey - Hex pubkey of the profile to load.
 * @param ref - Optional ref to an element. When provided, an IntersectionObserver
 *              will automatically promote the priority to "high" while the element
 *              is visible in the viewport, and demote it to "normal" when off-screen.
 *              This avoids the need for callers to manually specify priority.
 */
export function useUserProfile(pubKey?: string, ref?: RefObject<Element | null>): CachedMetadata | undefined {
  const system = use(SnortContext)

  // Track the current priority in a ref so the IntersectionObserver callback
  // can update it without causing a re-render on its own.
  const priorityRef = useRef<ProfilePriority>("normal")

  // Attach an IntersectionObserver when a ref is provided.
  // Promotes to "high" when the element enters the viewport, "normal" when it leaves.
  useEffect(() => {
    if (!pubKey || !ref) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      entries => {
        const isVisible = entries.some(e => e.isIntersecting)
        const nextPriority: ProfilePriority = isVisible ? "high" : "normal"
        if (priorityRef.current !== nextPriority) {
          priorityRef.current = nextPriority
          system.profileLoader.TrackKeys(pubKey, nextPriority)
        }
      },
      { threshold: 0 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [pubKey, ref, system])

  return useSyncExternalStore<CachedMetadata | undefined>(
    h => {
      if (pubKey) {
        // Use O(1) per-key subscription instead of the broad "change" event
        const unsub = system.profileLoader.cache.subscribe(pubKey, h)
        system.profileLoader.TrackKeys(pubKey, priorityRef.current)

        return () => {
          unsub()
          system.profileLoader.UntrackKeys(pubKey)
        }
      }
      return () => {
        // noop
      }
    },
    () => system.profileLoader.cache.getFromCache(pubKey),
    () => undefined,
  )
}
