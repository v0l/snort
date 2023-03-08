import { useSyncExternalStore } from "react";
import { FlatNoteStore, NoteStore, NoteStoreSnapshot } from "System/NoteCollection";

const useNoteStore = (store: NoteStore) => {
  const subscribe = (store: NoteStore, onChanged: () => void) => {
    if (store instanceof FlatNoteStore) {
      return store.hook(onChanged);
    }
    throw new Error("Cannot hook this kind of NoteStore");
  };
  const getState = (store: NoteStore) => {
    return store.getSnapshot();
  };
  return useSyncExternalStore<NoteStoreSnapshot>(
    v => subscribe(store, v),
    () => getState(store)
  );
};

export default useNoteStore;
