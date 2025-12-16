import type { TaggedNostrEvent, RequestBuilder, SystemInterface } from "@snort/system";
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
      q.start();
      return () => {
        q.flush();
        q.off("event", handle);
        q.cancel();
      };
    },
  };
}
