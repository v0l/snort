import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import useFollowsControls from "@/Hooks/useFollowControls";

export function useArticles() {
  const { followList } = useFollowsControls();

  const sub = useMemo(() => {
    const rb = new RequestBuilder("articles");
    if (followList.length > 0) {
      rb.withFilter().kinds([EventKind.LongFormTextNote]).authors(followList).limit(10);
    }
    return rb;
  }, [followList]);

  return useRequestBuilder(sub);
}
