import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import useLogin from "@/Hooks/useLogin";

export function useArticles() {
  const { publicKey, follows } = useLogin(s => ({ publicKey: s.publicKey, follows: s.state.follows }));

  const sub = useMemo(() => {
    if (!publicKey) return null;
    const rb = new RequestBuilder(`articles:${publicKey}`);
    rb.withFilter().kinds([EventKind.LongFormTextNote]).authors(follows).limit(20);

    return rb;
  }, [follows, publicKey]);

  return useRequestBuilder(sub);
}
