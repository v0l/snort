import { unixNow } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { findTag } from "@/Utils";
import { Hour } from "@/Utils/Const";

export default function useLiveStreams() {
  const sub = useMemo(() => {
    const rb = new RequestBuilder("streams");
    rb.withFilter()
      .kinds([EventKind.LiveEvent])
      .since(unixNow() - 4 * Hour);
    return rb;
  }, []);

  return useRequestBuilder(sub)
    .filter(a => {
      return findTag(a, "status") === "live";
    })
    .sort((a, b) => {
      const sA = Number(findTag(a, "starts"));
      const sB = Number(findTag(b, "starts"));
      return sA > sB ? -1 : 1;
    });
}
