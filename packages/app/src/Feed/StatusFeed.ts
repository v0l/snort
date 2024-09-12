import { unixNow } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { findTag } from "@/Utils";

export function useStatusFeed(id?: string, leaveOpen = false) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`statud:${id}`);
    rb.withOptions({ leaveOpen });
    if (id) {
      rb.withFilter()
        .kinds([30315 as EventKind])
        .authors([id]);
    }
    return rb;
  }, [id]);

  const status = useRequestBuilder(sub);

  const statusFiltered = status.filter(a => {
    const exp = Number(findTag(a, "expiration"));
    return isNaN(exp) || exp >= unixNow();
  });
  const general = statusFiltered?.find(a => findTag(a, "d") === "general");
  const music = statusFiltered?.find(a => findTag(a, "d") === "music");

  return {
    general,
    music,
  };
}
