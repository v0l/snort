import { useSyncExternalStore } from "react";
import { NoteStore } from "System/NoteCollection";

const useNoteStore = <TStore extends NoteStore, TSnapshot = ReturnType<TStore["getSnapshot"]>>(
  store: Readonly<TStore>
) => {
  const subscribe = (store: Readonly<TStore>, onChanged: () => void) => {
    return store.hook(onChanged);
  };
  const getState = (store: Readonly<TStore>) => {
    return store.getSnapshot() as TSnapshot;
  };
  return useSyncExternalStore<TSnapshot>(
    v => subscribe(store, v),
    () => getState(store)
  );
};

export default useNoteStore;
