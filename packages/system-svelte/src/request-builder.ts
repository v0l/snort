import { type NoteStore, type RequestBuilder, type StoreSnapshot, type SystemInterface } from "@snort/system";
import { getContext } from "svelte";

export function useRequestBuilder<T extends NoteStore>(type: new () => T, rb: RequestBuilder) {
  const system = getContext("snort") as SystemInterface;
  type TSnap = StoreSnapshot<ReturnType<T["getSnapshotData"]>>;
  return {
    subscribe: (set: (value: TSnap) => void) => {
      const q = system.Query(type, rb);
      q.uncancel();
      const release = q.feed.hook(() => {
        set(q.feed.snapshot as TSnap);
      });
      return () => {
        q.cancel();
        release();
      };
    },
  };
}
