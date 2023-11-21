import { EventKind, NoteCollection, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import useLogin from "@/Hooks/useLogin";
import { useMemo } from "react";

export function useArticles() {
  const { publicKey, follows } = useLogin();

  const sub = useMemo(() => {
    if (!publicKey) return null;
    const rb = new RequestBuilder(`articles:${publicKey}`);
    rb.withFilter().kinds([EventKind.LongFormTextNote]).authors(follows.item).limit(20);

    return rb;
  }, [follows.timestamp]);

  return useRequestBuilder(NoteCollection, sub);
}
