import { useSyncExternalStore } from "react";
import { RequestBuilder, EmptySnapshot, NoteStore, StoreSnapshot, SystemInterface } from "@snort/system";
import { unwrap } from "@snort/shared";

/**
 * Send a query to the relays and wait for data
 */
const useRequestBuilder = <TStore extends NoteStore, TSnapshot = ReturnType<TStore["getSnapshotData"]>>(
  system: SystemInterface,
  type: { new (): TStore },
  rb: RequestBuilder | null,
) => {
  const subscribe = (onChanged: () => void) => {
    if (rb) {
      const q = system.Query<TStore>(type, rb);
      const release = q.feed.hook(onChanged);
      q.uncancel();
      return () => {
        q.cancel();
        release();
      };
    }
    return () => {
      // noop
    };
  };
  const getState = (): StoreSnapshot<TSnapshot> => {
    const q = system.GetQuery(rb?.id ?? "");
    if (q) {
      return unwrap(q).feed?.snapshot as StoreSnapshot<TSnapshot>;
    }
    return EmptySnapshot as StoreSnapshot<TSnapshot>;
  };
  return useSyncExternalStore<StoreSnapshot<TSnapshot>>(
    v => subscribe(v),
    () => getState(),
  );
};

export { useRequestBuilder };
