import { EventKind, NoteCollection, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { findTag } from "SnortUtils";
import { useMemo } from "react";

export function useStatusFeed(id?: string, leaveOpen = false) {
  const sub = useMemo(() => {
    if (!id) return null;

    const rb = new RequestBuilder(`statud:${id}`);
    rb.withOptions({ leaveOpen });
    rb.withFilter()
      .kinds([30315 as EventKind])
      .authors([id]);

    return rb;
  }, [id]);

  const status = useRequestBuilder(NoteCollection, sub);

  const general = status.data?.find(a => findTag(a, "d") === "general");
  const music = status.data?.find(a => findTag(a, "d") === "music");

  return {
    general,
    music,
  };
}
