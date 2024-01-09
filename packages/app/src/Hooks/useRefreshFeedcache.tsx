import { unwrap } from "@snort/shared";
import { RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useEffect, useMemo } from "react";

import { RefreshFeedCache } from "@/Cache/RefreshFeedCache";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

export function useRefreshFeedCache<T>(c: RefreshFeedCache<T>, leaveOpen = false) {
  const login = useLogin();
  const { publisher, system } = useEventPublisher();

  const sub = useMemo(() => {
    if (login.publicKey) {
      const rb = new RequestBuilder(`using-${c.name}`);
      rb.withOptions({
        leaveOpen,
      });
      c.buildSub(login, rb);
      return rb;
    }
    return undefined;
  }, [login]);

  useEffect(() => {
    if (sub) {
      const q = system.Query(sub);
      const handler = (evs: Array<TaggedNostrEvent>) => {
        c.onEvent(evs, unwrap(login.publicKey), publisher);
      };
      q.on("event", handler);
      q.uncancel();
      return () => {
        q.off("event", handler);
        q.cancel();
      };
    }
  }, [sub]);
}
