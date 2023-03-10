import { useSyncExternalStore } from "react";
import { NoteStore, StoreSnapshot } from "System/NoteCollection";

const useNoteStore = <TStore extends NoteStore, TSnapshot = ReturnType<TStore["getSnapshotData"]>>(
  store: Readonly<TStore>,
  debounced?: number
) => {
  const subscribe = (store: Readonly<TStore>, onChanged: () => void) => {
    let t: ReturnType<typeof setTimeout> | undefined;
    return store.hook(() => {
      if (!t) {
        t = setTimeout(() => {
          clearTimeout(t);
          t = undefined;
          onChanged();
          console.debug("changed");
        }, debounced ?? 100);
      }
    });
  };
  const getState = (store: Readonly<TStore>): StoreSnapshot<TSnapshot> => {
    return store.snapshot as StoreSnapshot<TSnapshot>;
  };
  return useSyncExternalStore<StoreSnapshot<TSnapshot>>(
    v => subscribe(store, v),
    () => getState(store)
  );
};

export default useNoteStore;
