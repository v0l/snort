import { useMemo } from "react";
import { RequestBuilder, EventKind, NoteCollection, NostrLink } from "@snort/system";
import { useRequestBuilder } from "./useRequestBuilder";

export function useReactions(
  subId: string,
  ids: NostrLink | Array<NostrLink>,
  others?: (rb: RequestBuilder) => void,
  leaveOpen?: boolean,
) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(subId);
    rb.withOptions({ leaveOpen });

    const links = Array.isArray(ids) ? ids : [ids];
    if (links.length > 0) {
      const grouped = links.reduce(
        (acc, v) => {
          acc[v.type] ??= [];
          acc[v.type].push(v);
          return acc;
        },
        {} as Record<string, Array<NostrLink>>,
      );

      for (const v of Object.values(grouped)) {
        rb.withFilter()
          .kinds([EventKind.TextNote, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt])
          .replyToLink(v);
      }
    }
    others?.(rb);
    return rb;
  }, [ids, others]);

  return useRequestBuilder(sub);
}
