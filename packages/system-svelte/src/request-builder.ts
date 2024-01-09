import { TaggedNostrEvent, type RequestBuilder, type SystemInterface } from "@snort/system";
import { getContext } from "svelte";

export function useRequestBuilder(rb: RequestBuilder) {
  const system = getContext("snort") as SystemInterface;
  return {
    subscribe: (set: (value: Array<TaggedNostrEvent>) => void) => {
      const q = system.Query(rb);
      const handle = () => {
        set(q.snapshot);
      };
      q.uncancel();
      q.on("event", handle);
      return () => {
        q.off("event", handle);
        q.cancel();
      };
    },
  };
}
