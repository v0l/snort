import { use, useMemo, useSyncExternalStore } from "react"
import { EmptySnapshot, type RequestBuilder, type TaggedNostrEvent } from "@snort/system"
import { SnortContext } from "./context"

/**
 * Send a query to the relays and wait for data
 */
export function useRequestBuilder(rb: RequestBuilder): Array<TaggedNostrEvent> {
  const system = use(SnortContext)
  // Eagerly create the query so it exists during SSR.
  // On the client the same query is reused; on the server it registers
  // the request and makes data available after a FetchAll() pass.
  const q = useMemo(() => system.Query(rb), [system, rb])
  return useSyncExternalStore(
    v => {
      q.on("event", v)
      q.uncancel()
      q.start()
      return () => {
        q.flush()
        q.off("event", v)
        q.cancel()
      }
    },
    () => q.snapshot,
    () => q.snapshot,
  )
}

/**
 * More advanced hook which returns the Query object
 */
export function useRequestBuilderAdvanced(rb: RequestBuilder) {
  const system = use(SnortContext)
  const q = useMemo(() => {
    const q = system.Query(rb)
    return q
  }, [rb])

  return q
}
