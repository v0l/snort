import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import useLogin from "@/Hooks/useLogin";

export function useNotificationsView() {
  const publicKey = useLogin(s => s.publicKey);
  const kinds = [EventKind.TextNote, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt];
  const req = useMemo(() => {
    const rb = new RequestBuilder("notifications");
    rb.withOptions({
      leaveOpen: true,
    });
    if (publicKey) {
      rb.withFilter().kinds(kinds).tag("p", [publicKey]);
    }
    return rb;
  }, [publicKey]);
  return useRequestBuilder(req);
}
