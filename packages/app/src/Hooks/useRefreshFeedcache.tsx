import { SnortContext } from "@snort/system-react";
import { useContext, useEffect, useMemo } from "react";
import { NoopStore, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { unwrap } from "@snort/shared";

import { RefreshFeedCache } from "Cache/RefreshFeedCache";
import useLogin from "./useLogin";

export function useRefreshFeedCache<T>(c: RefreshFeedCache<T>, leaveOpen = false) {
    const system = useContext(SnortContext);
    const login = useLogin();

    const sub = useMemo(() => {
        if (login) {
            const rb = new RequestBuilder(`using-${c.name}`);
            rb.withOptions({
                leaveOpen
            })
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
                        c.onEvent(tBuf, unwrap(login.publisher));
                    }, 100);
                } else {
                    tBuf.push(...evs);
                }
            })
            q.uncancel();
            return () => {
                q.cancel();
                q.sendClose();
                releaseOnEvent();
            };
        }
        return () => {
            // noop
        };
    }, [sub]);
}