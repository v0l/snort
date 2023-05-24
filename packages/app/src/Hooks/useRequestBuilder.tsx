import { useSyncExternalStore } from "react";
import { RequestBuilder, System } from "System";
import { EmptySnapshot, NoteStore, StoreSnapshot } from "System/NoteCollection";
import { unwrap } from "SnortUtils";

const useRequestBuilder = <TStore extends NoteStore, TSnapshot = ReturnType<TStore["getSnapshotData"]>>(
  type: { new (): TStore },
  rb: RequestBuilder | null,
  debounced?: number
) => {
  const subscribe = (onChanged: () => void) => {
    const store = System.Query<TStore>(type, rb);
    let t: ReturnType<typeof setTimeout> | undefined;
    const release = store.hook(() => {
      if (!t) {
        t = setTimeout(() => {
          clearTimeout(t);
          t = undefined;
          onChanged();
        }, debounced ?? 500);
      }
    });

    return () => {
      if (rb?.id) {
        System.CancelQuery(rb.id);
      }
      release();
    };
  };
  const getState = (): StoreSnapshot<TSnapshot> => {
    if (rb?.id) {
      const q = System.GetQuery(rb.id);
      if (q) {
        return unwrap(q).feed?.snapshot as StoreSnapshot<TSnapshot>;
      }
    }
    return EmptySnapshot as StoreSnapshot<TSnapshot>;
  };
  return useSyncExternalStore<StoreSnapshot<TSnapshot>>(
    v => subscribe(v),
    () => getState()
  );
};

export default useRequestBuilder;
