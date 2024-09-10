import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export function ReviewSummary({ link }: { link: NostrLink }) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`reviews:${link.id}`);
    rb.withFilter()
      .kinds([1986 as EventKind])
      .replyToLink([link]);
    return rb;
  }, [link.id]);

  const data = useRequestBuilder(sub);
  return <pre>{JSON.stringify(data, undefined, 2)}</pre>;
}
