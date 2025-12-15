import { use, useEffect, useMemo, useSyncExternalStore } from "react";
import { EmptySnapshot, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { SnortContext } from "./context";

/**
 * Send a query to the relays and wait for data
 */
export function useRequestBuilder(rb: RequestBuilder): Array<TaggedNostrEvent> {
  const system = use(SnortContext);
  return useSyncExternalStore(
    v => {
      const q = system.Query(rb);
      // race condition here
      q.on("event", v);
      q.uncancel();
      q.start();
      return () => {
        q.flush();
        q.off("event", v);
        q.cancel();
      };
    },
    () => {
      const q = system.GetQuery(rb.id);
      if (q) {
        return q.snapshot;
      } else {
        return EmptySnapshot;
      }
    },
  );
}

/**
 * More advanced hook which returns the Query object
 */
export function useRequestBuilderAdvanced(rb: RequestBuilder) {
  const system = use(SnortContext);
  const q = useMemo(() => {
    const q = system.Query(rb);
    return q;
  }, [rb]);

  return q;
}
