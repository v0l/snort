import { RequestBuilder, EventKind, NoteCollection, NostrLink } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import useLogin from "Hooks/useLogin";
import { useMemo } from "react";

export function useReactions(subId: string, ids: Array<NostrLink>, others?: (rb: RequestBuilder) => void) {
  const { preferences: pref } = useLogin();

  const sub = useMemo(() => {
    const rb = new RequestBuilder(subId);

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
        rb.withFilter()
          .kinds(
            pref.enableReactions
              ? [EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt]
              : [EventKind.ZapReceipt, EventKind.Repost],
          )
          .replyToLink(v);
      }
    }
    others?.(rb);
    return rb.numFilters > 0 ? rb : null;
  }, [ids]);

  return useRequestBuilder(NoteCollection, sub);
}
