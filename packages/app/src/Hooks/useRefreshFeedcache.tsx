import { useEffect, useMemo } from "react";
import { NoopStore, RequestBuilder, TaggedNostrEvent } from "@snort/system";

import { RefreshFeedCache } from "@/Cache/RefreshFeedCache";
import useLogin from "./useLogin";
import useEventPublisher from "./useEventPublisher";
import { unwrap } from "@snort/shared";

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
      const q = system.Query(NoopStore, sub);
      let t: ReturnType<typeof setTimeout> | undefined;
      let tBuf: Array<TaggedNostrEvent> = [];
      const releaseOnEvent = q.feed.onEvent(evs => {
        if (!t) {
          tBuf = [...evs];
          t = setTimeout(() => {
            t = undefined;
            c.onEvent(tBuf, unwrap(login.publicKey), publisher);
          }, 100);
        } else {
          tBuf.push(...evs);
        }
      });
      q.uncancel();
      return () => {
        q.cancel();
        q.sendClose();
        releaseOnEvent();
      };
    }
  }, [sub]);
}
