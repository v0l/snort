import { useSyncExternalStore } from "react";
import { RequestBuilder, System } from "System";
import { EmptySnapshot, NoteStore, StoreSnapshot } from "System/NoteCollection";
import { unwrap } from "Util";

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
      const feed = System.GetFeed(rb.id);
      if (feed) {
        return unwrap(feed).snapshot as StoreSnapshot<TSnapshot>;
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
