import { useSyncExternalStore } from "react";
import { RequestBuilder } from "System";
import { EmptySnapshot, NoteStore, StoreSnapshot } from "System/NoteCollection";
import { unwrap } from "SnortUtils";
import { System } from "index";

const useRequestBuilder = <TStore extends NoteStore, TSnapshot = ReturnType<TStore["getSnapshotData"]>>(
  type: { new (): TStore },
  rb: RequestBuilder | null
) => {
  const subscribe = (onChanged: () => void) => {
    if (rb) {
      const q = System.Query<TStore>(type, rb);
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
    const q = System.GetQuery(rb?.id ?? "");
    if (q) {
      return unwrap(q).feed?.snapshot as StoreSnapshot<TSnapshot>;
    }
    return EmptySnapshot as StoreSnapshot<TSnapshot>;
  };
  return useSyncExternalStore<StoreSnapshot<TSnapshot>>(
    v => subscribe(v),
    () => getState()
  );
};

export default useRequestBuilder;
