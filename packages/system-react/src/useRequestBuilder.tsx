import { useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { EmptySnapshot, RequestBuilder } from "@snort/system";
import { SnortContext } from "./context";

/**
 * Send a query to the relays and wait for data
 */
export function useRequestBuilder(rb: RequestBuilder) {
  const system = useContext(SnortContext);
  return useSyncExternalStore(
    v => {
      const q = system.Query(rb);
      q.on("event", v);
      q.uncancel();
      return () => {
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
  const system = useContext(SnortContext);
  const q = useMemo(() => {
    const q = system.Query(rb);
    q.uncancel();
    return q;
  }, [rb]);
  useEffect(() => {
    return () => {
      q?.cancel();
    };
  }, [q]);

  return q;
}
