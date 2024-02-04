import { useMemo } from "react";
import { RequestBuilder, EventKind, NoteCollection, NostrLink } from "@snort/system";
import { useRequestBuilder } from "./useRequestBuilder";

export function useReactions(
  subId: string,
  ids: Array<NostrLink>,
  others?: (rb: RequestBuilder) => void,
  leaveOpen?: boolean,
) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(subId);
    rb.withOptions({ leaveOpen });

    if (ids.length > 0) {
      const grouped = ids.reduce(
        (acc, v) => {
          acc[v.type] ??= [];
          acc[v.type].push(v);
          return acc;
        },
        {} as Record<string, Array<NostrLink>>,
      );

      for (const [, v] of Object.entries(grouped)) {
        rb.withFilter().kinds([EventKind.TextNote, EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt]).replyToLink(v);
      }
    }
    others?.(rb);
    return rb.numFilters > 0 ? rb : undefined;
  }, [ids]);

  return useRequestBuilder(sub);
}
