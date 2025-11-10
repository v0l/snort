import { EventKind, RequestBuilder } from "@snort/system";
import { SnortContext, useCached, useRequestBuilder } from "@snort/system-react";
import { useCallback, useContext, useMemo } from "react";

import useFollowsControls from "@/Hooks/useFollowControls";
import { Hour } from "@/Utils/Const";

export function useArticles(limit = 10) {
  const { followList } = useFollowsControls();

  const sub = useMemo(() => {
    const rb = new RequestBuilder("articles");
    if (followList.length > 0) {
      rb.withFilter().kinds([EventKind.LongFormTextNote]).authors(followList).limit(limit);
    }
    return rb;
  }, [followList]);

  return useRequestBuilder(sub);
}

export function useCachedArticles(limit = 10) {
  const { followList } = useFollowsControls();
  const system = useContext(SnortContext);

  const sub = useMemo(() => {
    const rb = new RequestBuilder("articles");
    if (followList.length > 0) {
      rb.withFilter().kinds([EventKind.LongFormTextNote]).authors(followList).limit(limit);
    }
    return rb;
  }, [followList]);

  const loader = useCallback(async () => {
    return await system.Fetch(sub);
  }, [sub, system]);

  const { data } = useCached("articles", loader, Hour * 6);
  return data ?? [];
}
