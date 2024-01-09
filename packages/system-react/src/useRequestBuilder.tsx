import { useContext, useSyncExternalStore } from "react";
import { RequestBuilder, EmptySnapshot, NoteStore, StoreSnapshot } from "@snort/system";
import { unwrap } from "@snort/shared";
import { SnortContext } from "./context";

/**
 * Send a query to the relays and wait for data
 */
const useRequestBuilder = (
  rb: RequestBuilder | null,
) => {
  const system = useContext(SnortContext);
  const subscribe = (onChanged: () => void) => {
    if (rb) {
      const q = system.Query(rb);
      q.on("event", onChanged);
      q.uncancel();
      return () => {
        q.off("event", onChanged);
        q.cancel();
      };
    }
    return () => {
      // noop
    };
  };
  const getState = () => {
    const q = system.GetQuery(rb?.id ?? "");
    if (q) {
      return q.snapshot;
    }
    return EmptySnapshot;
  };
  return useSyncExternalStore(
    v => subscribe(v),
    () => getState(),
  );
};

export { useRequestBuilder };
